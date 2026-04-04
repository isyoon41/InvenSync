export interface ReviewEvidenceSearchResult {
  id: string;
  markName: string;
  applicationNumber?: string;
  registerNumber?: string;
  applicantName?: string;
  classNo?: number;
  statusLabel?: string;
  relevanceScore?: number;
  designatedGoodsSummary?: string;
}

export interface ReviewEvidence {
  id: string;
  reviewReportId: string;
  searchResultId: string;
  searchResult?: ReviewEvidenceSearchResult;
  note?: string;
  sortOrder: number;
  createdAt: Date;
}

export interface ReviewReport {
  id: string;
  inquiryId: string;
  candidateRunId?: string;
  searchJobId?: string;
  summary?: string;
  riskNote?: string;
  recommendation?: string;
  clientReplyDraft?: string;
  internalNote?: string;
  approvedByUserId?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  evidences?: ReviewEvidence[];
}

export interface CreateReviewReportInput {
  inquiryId: string;
  candidateRunId?: string;
  searchJobId?: string;
  summary?: string;
  riskNote?: string;
  recommendation?: string;
  clientReplyDraft?: string;
  internalNote?: string;
}

export interface UpdateReviewReportInput {
  summary?: string;
  riskNote?: string;
  recommendation?: string;
  clientReplyDraft?: string;
  internalNote?: string;
}

export interface ApproveReviewReportInput {
  approvedByUserId: string;
  approvedAt: Date;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ReviewReportSummary {
  inquiryId: string;
  proposedMarkName?: string;
  riskLevel: RiskLevel;
  matchingMarksCount: number;
  approvedAt?: Date;
  reviewedBy?: string;
}
