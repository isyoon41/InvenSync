import type { Inquiry, LLMAttachmentContext } from "@ip-review/domain";

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
