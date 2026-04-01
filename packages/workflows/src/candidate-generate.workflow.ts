import type { ILLMPort, Inquiry, GeneratedCandidate } from "@ip-review/domain";
import { ValidationError, InquiryProcessingError } from "@ip-review/domain";
import { getRepositoryContainer } from "@ip-review/db";
import { prisma } from "@ip-review/db";

export interface CandidateGenerateRequest {
  inquiryId: string;
  llmPort: ILLMPort;
  runVersion?: number;
}

export interface CandidateGenerateResult {
  candidateRunId: string;
  generatedCandidates: GeneratedCandidate[];
  totalCount: number;
}

export class CandidateGenerateWorkflow {
  constructor(private repositories = getRepositoryContainer()) {}

  async execute(request: CandidateGenerateRequest): Promise<CandidateGenerateResult> {
    try {
      const inquiry = await this.repositories.inquiries.findById(request.inquiryId);
      if (!inquiry) {
        throw new ValidationError(`Inquiry not found: ${request.inquiryId}`);
      }

      if (inquiry.status !== "parsed") {
        throw new InquiryProcessingError(
          inquiry.id,
          "candidate_generation",
          `Inquiry must be in 'parsed' status, got '${inquiry.status}'`
        );
      }

      // Get latest parsed request
      const parsedRequest = await prisma.parsedRequest.findFirst({
        where: { inquiryId: inquiry.id, isCurrent: true },
      });

      if (!parsedRequest) {
        throw new InquiryProcessingError(
          inquiry.id,
          "candidate_generation",
          "No current parsed request found"
        );
      }

      const runVersion = request.runVersion || 1;

      // Create candidate run
      const candidateRun = await prisma.candidateRun.create({
        data: {
          inquiryId: inquiry.id,
          state: "running",
          runVersion,
          inputSnapshot: {
            markName: parsedRequest.markNameNormalized,
            goods: parsedRequest.goodsDescriptionNormalized,
            confidence: parsedRequest.confidence,
          },
        },
      });

      // Generate candidates using LLM
      const generatedCandidates = await request.llmPort.generateCandidates({
        proposedMarkName: parsedRequest.markNameNormalized || "",
        goodsDescription: parsedRequest.goodsDescriptionNormalized || "",
        count: 8,
        includeCompetitors: true,
      });

      // Store candidates
      const storedCandidates = await Promise.all(
        generatedCandidates.map((candidate, index) =>
          prisma.goodsCandidate.create({
            data: {
              candidateRunId: candidateRun.id,
              term: candidate.term,
              normalizedTerm: candidate.normalizedTerm,
              classNo: candidate.classNo,
              sourceType: candidate.sourceType,
              confidence: candidate.confidence,
              rationale: candidate.rationale,
              sortOrder: index,
            },
          })
        )
      );

      // Update candidate run state
      await prisma.candidateRun.update({
        where: { id: candidateRun.id },
        data: { state: "done" },
      });

      // Update inquiry status
      await this.repositories.inquiries.update(inquiry.id, {
        status: "candidate_ready",
      });

      return {
        candidateRunId: candidateRun.id,
        generatedCandidates: storedCandidates as GeneratedCandidate[],
        totalCount: storedCandidates.length,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof InquiryProcessingError) {
        throw error;
      }
      throw new InquiryProcessingError(
        request.inquiryId,
        "candidate_generation",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
