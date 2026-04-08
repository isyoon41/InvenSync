import type { ILLMPort, GeneratedCandidate } from "@ip-review/domain";
import { ValidationError, InquiryProcessingError } from "@ip-review/domain";
import { getRepositoryContainer } from "@ip-review/db";
import { prisma } from "@ip-review/db";
import { RecommendGoodsEngine, type SimilarGoodsLookupPort } from "@ip-review/llm-engine";

export interface CandidateGenerateRequest {
  inquiryId: string;
  llmPort: ILLMPort;
  similarGoodsPort: SimilarGoodsLookupPort;
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
      const parsedJson = (parsedRequest.parsedJson ?? {}) as { targetClasses?: unknown };
      const targetClasses = normalizeTargetClasses(parsedJson.targetClasses);

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
            targetClasses,
          },
        },
      });

      // 상품 후보 추천 엔진: KIPRIS 유사상품군을 우선 수집하고 내부 DB를 보조 근거로 삼아 Claude가 최종 선정
      const engine = new RecommendGoodsEngine(
        this.repositories.goodsTerms,
        request.llmPort,
        request.similarGoodsPort
      );
      const generatedCandidates = await engine.recommend({
        proposedMarkName: parsedRequest.markNameNormalized || "",
        goodsDescription: parsedRequest.goodsDescriptionNormalized || "",
        targetClasses,
        count: 8,
        includeCompetitors: true,
      });

      // Store candidates
      const storedCandidates = await Promise.all(
        generatedCandidates.map(async (candidate, index) => {
          const storedCandidate = await prisma.goodsCandidate.create({
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
          });

          const similarityGroupCodes = candidate.similarityGroupCodes ?? [];
          if (similarityGroupCodes.length > 0) {
            await prisma.goodsCandidateSimilarityGroup.createMany({
              data: similarityGroupCodes.map((similarityGroupCode, codeIndex) => ({
                goodsCandidateId: storedCandidate.id,
                similarityGroupCode,
                isPrimary: codeIndex === 0,
              })),
            });
          }

          return storedCandidate;
        })
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

function normalizeTargetClasses(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "number" ? item : Number(item)))
        .filter((item) => Number.isInteger(item) && item > 0 && item <= 45)
    )
  );
}
