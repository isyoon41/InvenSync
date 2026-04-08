import type { ILLMPort, Inquiry, ParsedInquiryData } from "@ip-review/domain";
import { ValidationError, InquiryProcessingError } from "@ip-review/domain";
import { getRepositoryContainer } from "@ip-review/db";
import { prisma } from "@ip-review/db";
import { getInquiryAttachmentContexts } from "./attachment-context";

export interface InquiryParseRequest {
  inquiryId: string;
  llmPort: ILLMPort;
  kiprisNormalizationEvidence?: string;
}

export interface InquiryParseResult {
  inquiry: Inquiry;
  parsedData: ParsedInquiryData;
  markNameNormalized: string;
  goodsDescription: string;
}

export class InquiryParseWorkflow {
  constructor(private repositories = getRepositoryContainer()) {}

  async execute(request: InquiryParseRequest): Promise<InquiryParseResult> {
    try {
      const inquiry = await this.repositories.inquiries.findById(request.inquiryId);
      if (!inquiry) {
        throw new ValidationError(`Inquiry not found: ${request.inquiryId}`);
      }

      if (!["new", "parsed"].includes(inquiry.status)) {
        throw new InquiryProcessingError(
          inquiry.id,
          "parse",
          `Inquiry must be in 'new' or 'parsed' status, got '${inquiry.status}'`
        );
      }

      const parsedData = await request.llmPort.parseInquiry({
        title: inquiry.title,
        rawText: inquiry.rawText,
        rawHtml: inquiry.rawHtml,
        senderEmail: inquiry.senderEmail,
        proposedMarkName: inquiry.proposedMarkName,
        attachments: getInquiryAttachmentContexts(inquiry),
        referenceEvidence: request.kiprisNormalizationEvidence,
      });

      if (!parsedData.markNameNormalized || !parsedData.goodsDescriptionNormalized) {
        throw new InquiryProcessingError(
          inquiry.id,
          "parse",
          "Failed to extract mark name or goods description"
        );
      }

      await prisma.parsedRequest.updateMany({
        where: { inquiryId: inquiry.id, isCurrent: true },
        data: { isCurrent: false },
      });

      // Store parsed data
      await prisma.parsedRequest.create({
        data: {
          inquiryId: inquiry.id,
          llmProvider: "anthropic",
          llmModel: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6",
          parsedJson: parsedData as any,
          markNameNormalized: parsedData.markNameNormalized,
          goodsDescriptionNormalized: parsedData.goodsDescriptionNormalized,
          industryGuess: parsedData.industry,
          missingFields: parsedData.missingFields,
          confidence: parsedData.confidence,
          isCurrent: true,
        },
      });

      // Update inquiry status to parsed
      const updatedInquiry = await this.repositories.inquiries.update(inquiry.id, {
        status: "parsed",
        proposedMarkName: parsedData.markNameNormalized,
      });

      return {
        inquiry: updatedInquiry,
        parsedData,
        markNameNormalized: parsedData.markNameNormalized,
        goodsDescription: parsedData.goodsDescriptionNormalized,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof InquiryProcessingError) {
        throw error;
      }
      throw new InquiryProcessingError(
        request.inquiryId,
        "parse",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
