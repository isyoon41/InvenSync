import type { ILLMPort, ReviewReport } from "@ip-review/domain";
import { ValidationError, InquiryProcessingError } from "@ip-review/domain";
import { getRepositoryContainer } from "@ip-review/db";
import { prisma } from "@ip-review/db";

export interface ReportGenerateRequest {
  inquiryId: string;
  searchJobId: string;
  llmPort: ILLMPort;
  manualNotes?: string;
}

export interface ReportGenerateResult {
  reviewReportId: string;
  reviewReport: ReviewReport;
}

export class ReportGenerateWorkflow {
  constructor(private repositories = getRepositoryContainer()) {}

  async execute(request: ReportGenerateRequest): Promise<ReportGenerateResult> {
    try {
      const inquiry = await this.repositories.inquiries.findById(request.inquiryId);
      if (!inquiry) {
        throw new ValidationError(`Inquiry not found: ${request.inquiryId}`);
      }

      if (inquiry.status !== "searched") {
        throw new InquiryProcessingError(
          inquiry.id,
          "report_generation",
          `Inquiry must be in 'searched' status, got '${inquiry.status}'`
        );
      }

      // Get search results
      const searchResults = await this.repositories.searchResults.findBySearchJob(
        request.searchJobId
      );

      // 최신 파싱 결과 조회
      const parsedRequest = await prisma.parsedRequest.findFirst({
        where: { inquiryId: inquiry.id, isCurrent: true },
        orderBy: { createdAt: 'desc' },
      });

      // metadata에서 고객정보 추출
      const meta = (inquiry.metadata ?? {}) as Record<string, any>;
      const clientName: string | undefined = meta.clientName || undefined;
      const companyName: string | undefined = meta.companyName || undefined;
      const clientEmail: string | undefined = meta.clientEmail || inquiry.senderEmail || undefined;

      // Generate report using LLM — 전체 컨텍스트 전달
      const generatedReport = await request.llmPort.generateReport({
        markName: parsedRequest?.markNameNormalized || inquiry.proposedMarkName || "Unknown Mark",
        goods: parsedRequest?.goodsDescriptionNormalized || inquiry.rawText,
        searchResults: searchResults.map((r) => ({
          markName: r.markName,
          applicantName: r.applicantName ?? undefined,
          relevanceScore: r.relevanceScore ?? undefined,
          statusLabel: r.statusLabel ?? undefined,
          applicationNumber: r.applicationNumber ?? undefined,
          classNo: r.classNo ?? undefined,
        })),
        clientName,
        companyName,
        clientEmail,
        parsedMarkName: parsedRequest?.markNameNormalized ?? undefined,
        parsedGoods: parsedRequest?.goodsDescriptionNormalized ?? undefined,
        industry: parsedRequest?.industryGuess ?? undefined,
      });

      // Create review report
      const reviewReport = await prisma.reviewReport.create({
        data: {
          inquiryId: inquiry.id,
          searchJobId: request.searchJobId,
          summary: generatedReport.summary,
          riskNote: generatedReport.riskNote,
          recommendation: generatedReport.recommendation,
          clientReplyDraft: generatedReport.clientReplyDraft,
          internalNote: request.manualNotes,
        },
      });

      // Create review evidences for top results
      const topResults = searchResults.slice(0, 5);
      await Promise.all(
        topResults.map((result, index) =>
          prisma.reviewEvidence.create({
            data: {
              reviewReportId: reviewReport.id,
              searchResultId: result.id,
              sortOrder: index,
            },
          })
        )
      );

      // Update inquiry status
      await this.repositories.inquiries.update(inquiry.id, {
        status: "reviewed",
      });

      const result = await this.repositories.reviewReports.findById(reviewReport.id);
      if (!result) {
        throw new Error("Failed to retrieve created review report");
      }

      return {
        reviewReportId: reviewReport.id,
        reviewReport: result,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof InquiryProcessingError) {
        throw error;
      }
      throw new InquiryProcessingError(
        request.inquiryId,
        "report_generation",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
