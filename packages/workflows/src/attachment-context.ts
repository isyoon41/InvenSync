import type { Inquiry, LLMAttachmentContext } from "@ip-review/domain";

const REPORT_ATTACHMENT_TEXT_LIMIT = 2_000;
const REPORT_TOTAL_TEXT_LIMIT = 6_000;

function isAttachmentContext(value: unknown): value is LLMAttachmentContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.fileName === "string" &&
    typeof record.mimeType === "string" &&
    typeof record.sizeBytes === "number" &&
    typeof record.kind === "string" &&
    typeof record.extractionStatus === "string"
  );
}

export function getInquiryAttachmentContexts(inquiry: Inquiry): LLMAttachmentContext[] {
  const attachments = inquiry.metadata?.attachments;
  if (!Array.isArray(attachments)) return [];
  return attachments.filter(isAttachmentContext);
}

function truncateForReport(text: string, limit: number): string {
  const normalized = text.trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}\n\n[첨부파일 본문은 보고서 단계에서 일부만 반영되었습니다.]`;
}

export function getReportAttachmentContexts(inquiry: Inquiry): LLMAttachmentContext[] {
  let remainingChars = REPORT_TOTAL_TEXT_LIMIT;

  return getInquiryAttachmentContexts(inquiry).map((attachment) => {
    const next: LLMAttachmentContext = {
      ...attachment,
      base64Data: undefined,
    };

    if (!attachment.textContent || remainingChars <= 0) {
      next.textContent = undefined;
      return next;
    }

    const sliceLimit = Math.min(REPORT_ATTACHMENT_TEXT_LIMIT, remainingChars);
    next.textContent = truncateForReport(attachment.textContent, sliceLimit);
    remainingChars -= Math.min(attachment.textContent.trim().length, sliceLimit);
    return next;
  });
}
