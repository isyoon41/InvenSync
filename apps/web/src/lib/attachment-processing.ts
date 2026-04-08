import mammoth from "mammoth";
import type { LLMAttachmentContext, LLMAttachmentKind } from "@ip-review/domain";

export const MAX_INQUIRY_ATTACHMENTS = 10;
export const MAX_ATTACHMENT_SIZE_BYTES = 4 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 24_000;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const TEXT_MIME_PREFIXES = ["text/"];
const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".tsv", ".rtf"];

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

function normalizeMimeType(file: File): string {
  const declared = file.type?.trim();
  if (declared) return declared;

  const extension = extensionOf(file.name);
  if (extension === ".pdf") return PDF_MIME;
  if (extension === ".docx") return DOCX_MIME;
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  if (TEXT_EXTENSIONS.includes(extension)) return "text/plain";
  return "application/octet-stream";
}

function classifyAttachment(fileName: string, mimeType: string): LLMAttachmentKind {
  const extension = extensionOf(fileName);
  if (mimeType === PDF_MIME || extension === ".pdf") return "pdf";
  if (mimeType === DOCX_MIME || extension === ".docx") return "text";
  if (IMAGE_MIME_TYPES.has(mimeType)) return "image";
  if (TEXT_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) return "text";
  if (TEXT_EXTENSIONS.includes(extension)) return "text";
  return "unsupported";
}

function truncateText(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= MAX_TEXT_CHARS) return normalized;
  return `${normalized.slice(0, MAX_TEXT_CHARS)}\n\n[첨부파일 본문이 길어 ${MAX_TEXT_CHARS.toLocaleString("ko-KR")}자까지만 분석에 포함했습니다.]`;
}

async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

async function processFile(file: File): Promise<LLMAttachmentContext> {
  const mimeType = normalizeMimeType(file);
  const kind = classifyAttachment(file.name, mimeType);
  const base = {
    fileName: file.name,
    mimeType,
    sizeBytes: file.size,
    kind,
  };

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      ...base,
      kind: "unsupported",
      extractionStatus: "too_large",
      error: `파일당 ${Math.round(MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024)}MB 이하만 AI 분석에 포함됩니다.`,
    };
  }

  try {
    if (kind === "text" && (mimeType === DOCX_MIME || extensionOf(file.name) === ".docx")) {
      const buffer = await fileToBuffer(file);
      const extracted = await mammoth.extractRawText({ buffer });
      return {
        ...base,
        extractionStatus: "ready",
        textContent: truncateText(extracted.value || ""),
        error: extracted.messages?.length ? extracted.messages.map((message) => message.message).join("; ") : undefined,
      };
    }

    if (kind === "text") {
      return {
        ...base,
        extractionStatus: "ready",
        textContent: truncateText(await file.text()),
      };
    }

    if (kind === "pdf" || kind === "image") {
      const buffer = await fileToBuffer(file);
      return {
        ...base,
        extractionStatus: "ready",
        base64Data: buffer.toString("base64"),
      };
    }

    return {
      ...base,
      extractionStatus: "unsupported",
      error: "현재는 PDF, DOCX, 이미지, 텍스트 파일만 AI 분석에 포함됩니다.",
    };
  } catch (error) {
    return {
      ...base,
      extractionStatus: "failed",
      error: error instanceof Error ? error.message : "첨부파일 처리 중 오류가 발생했습니다.",
    };
  }
}

export async function processInquiryAttachments(files: File[]): Promise<LLMAttachmentContext[]> {
  const limited = files.slice(0, MAX_INQUIRY_ATTACHMENTS);
  const results: LLMAttachmentContext[] = [];
  let totalBytes = 0;

  for (const file of limited) {
    const mimeType = normalizeMimeType(file);
    if (totalBytes + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
      results.push({
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        kind: "unsupported",
        extractionStatus: "too_large",
        error: `첨부파일 전체 용량은 ${Math.round(MAX_TOTAL_ATTACHMENT_BYTES / 1024 / 1024)}MB 이하만 AI 분석에 포함됩니다.`,
      });
      continue;
    }

    totalBytes += file.size;
    results.push(await processFile(file));
  }

  return results;
}
