export interface ParsedInquiryData {
  markNameNormalized?: string;
  goodsDescriptionNormalized?: string;
  normalizedGoods?: ParsedNormalizedGood[];
  industry?: string;
  targetClasses?: number[];
  missingFields?: string[];
  confidence?: number;
  reasoning?: string;
}

export interface ParsedNormalizedGood {
  classNo: number;
  term: string;
  kind?: "goods" | "service";
  basis?: string;
  evidenceLabel?: string;
  evidenceUrl?: string;
}

export interface LLMParseRequest {
  title: string;
  rawText: string;
  rawHtml?: string;
  senderEmail?: string;
  proposedMarkName?: string;
  attachments?: LLMAttachmentContext[];
  referenceEvidence?: string;
}

export type LLMAttachmentKind = "text" | "pdf" | "image" | "unsupported";

export type LLMAttachmentStatus = "ready" | "too_large" | "unsupported" | "failed";

export interface LLMAttachmentContext {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: LLMAttachmentKind;
  extractionStatus: LLMAttachmentStatus;
  textContent?: string;
  base64Data?: string;
  error?: string;
}

export interface CandidateGenerationRequest {
  proposedMarkName: string;
  goodsDescription: string;
  classNo?: number;
  targetClasses?: number[];
  count?: number;
  includeCompetitors?: boolean;
  referenceGoods?: CandidateReferenceGoods[];
  evidencePolicy?: string;
}

export interface CandidateReferenceGoods {
  term: string;
  normalizedTerm: string;
  classNo: number;
  sourceType: "kipris_similar_goods" | "internal_official_notice_name" | "internal_accepted_similar_name";
  confidence: number;
  rationale: string;
  similarityGroupCodes?: string[];
  query?: string;
}

export interface GeneratedCandidate {
  term: string;
  normalizedTerm: string;
  classNo: number;
  sourceType: "official_notice_name" | "accepted_similar_name" | "ai_generated" | "manual" | "competitor_reference";
  confidence: number;
  rationale: string;
  similarityGroupCodes?: string[];
}

export interface ReportGenerationRequest {
  markName: string;
  goods: string;
  searchResults: Array<{
    markName: string;
    applicantName?: string;
    relevanceScore?: number;
    statusLabel?: string;
    applicationNumber?: string;
    registerNumber?: string;
    classNo?: number;
    designatedGoodsSummary?: string;
    similarityGroupCodes?: string[];
  }>;
  candidateGoods?: Array<{
    term: string;
    normalizedTerm?: string;
    classNo: number;
    sourceType: string;
    rationale?: string;
    similarityGroupCodes?: string[];
  }>;
  // 고객 정보 (의뢰 등록 시 입력)
  clientName?: string;
  companyName?: string;
  clientEmail?: string;
  // AI 파싱 결과
  parsedMarkName?: string;
  parsedGoods?: string;
  industry?: string;
  // 담당 변리사
  handlerName?: string;
  attachments?: LLMAttachmentContext[];
  previousReports?: string[];
}

export interface GeneratedReport {
  summary: string;
  riskNote: string;
  recommendation: string;
  clientReplyDraft: string;
}

export interface ILLMPort {
  parseInquiry(request: LLMParseRequest): Promise<ParsedInquiryData>;
  generateCandidates(
    request: CandidateGenerationRequest
  ): Promise<GeneratedCandidate[]>;
  generateReport(request: ReportGenerationRequest): Promise<GeneratedReport>;
  isAvailable(): Promise<boolean>;
}
