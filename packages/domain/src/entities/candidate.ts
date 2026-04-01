export type CandidateRunState = "running" | "done" | "failed";
export type CandidateSourceType =
  | "official_notice_name"
  | "accepted_similar_name"
  | "ai_generated"
  | "manual"
  | "competitor_reference";

export interface GoodsCandidate {
  id: string;
  candidateRunId: string;
  term: string;
  normalizedTerm?: string;
  classNo: number;
  sourceType: CandidateSourceType;
  confidence: number;
  rationale: string;
  isSelected: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  similarityGroupCodes?: string[];
}

export interface CandidateRun {
  id: string;
  inquiryId: string;
  createdByUserId?: string;
  state: CandidateRunState;
  runVersion: number;
  inputSnapshot: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCandidateRunInput {
  inquiryId: string;
  createdByUserId?: string;
  runVersion: number;
  inputSnapshot: Record<string, any>;
}

export interface CreateGoodsCandidateInput {
  candidateRunId: string;
  term: string;
  normalizedTerm?: string;
  classNo: number;
  sourceType: CandidateSourceType;
  confidence?: number;
  rationale: string;
  isSelected?: boolean;
  sortOrder?: number;
}

export interface UpdateGoodsCandidateInput {
  isSelected?: boolean;
  confidence?: number;
  sortOrder?: number;
  rationale?: string;
}
