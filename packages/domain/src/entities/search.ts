export type SearchSourceSystem = "kipris" | "mock" | "python_sidecar";
export type SearchMode =
  | "exact_mark"
  | "mark_keyword"
  | "designated_goods"
  | "class_no"
  | "similarity_group";
export type SearchJobState = "queued" | "running" | "done" | "failed";

export interface SearchResult {
  id: string;
  searchJobId: string;
  sourceSystem: SearchSourceSystem;
  mode: SearchMode;
  applicationNumber?: string;
  registerNumber?: string;
  markName: string;
  applicantName?: string;
  classNo?: number;
  designatedGoodsSummary?: string;
  statusLabel?: string;
  sampleImageUrl?: string;
  relevanceScore?: number;
  detailJson?: Record<string, any>;
  rawXml?: string;
  isShortlisted: boolean;
  createdAt: Date;
  similarityGroupCodes?: string[];
}

export interface SearchJob {
  id: string;
  inquiryId: string;
  candidateRunId?: string;
  createdByUserId?: string;
  state: SearchJobState;
  queryStrategy?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export interface CreateSearchJobInput {
  inquiryId: string;
  candidateRunId?: string;
  createdByUserId?: string;
  queryStrategy?: Record<string, any>;
}

export interface UpdateSearchJobInput {
  state?: SearchJobState;
  completedAt?: Date;
}

export interface SearchQuery {
  sourceSystem: SearchSourceSystem;
  mode: SearchMode;
  requestParams: Record<string, any>;
}

export interface SearchResultsBundle {
  searchJobId: string;
  totalCount: number;
  results: SearchResult[];
  queriesExecuted: number;
  executionTimeMs: number;
}
