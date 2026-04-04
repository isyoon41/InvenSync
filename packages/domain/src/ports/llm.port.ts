export interface ParsedInquiryData {
  markNameNormalized?: string;
  goodsDescriptionNormalized?: string;
  industry?: string;
  missingFields?: string[];
  confidence?: number;
  reasoning?: string;
}

export interface LLMParseRequest {
  title: string;
  rawText: string;
  rawHtml?: string;
  senderEmail?: string;
  proposedMarkName?: string;
}

export interface CandidateGenerationRequest {
  proposedMarkName: string;
  goodsDescription: string;
  classNo?: number;
  count?: number;
  includeCompetitors?: boolean;
}

export interface GeneratedCandidate {
  term: string;
  normalizedTerm: string;
  classNo: number;
  sourceType: "ai_generated" | "manual";
  confidence: number;
  rationale: string;
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
    classNo?: number;
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
