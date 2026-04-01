import type { User, Inquiry, GoodsCandidate, CandidateRun, SearchJob, SearchResult, ReviewReport } from "../entities";

export interface IRepository<T, CreateInput, UpdateInput> {
  create(input: CreateInput): Promise<T>;
  findById(id: string): Promise<T | null>;
  update(id: string, input: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
  list(options?: ListOptions): Promise<ListResult<T>>;
}

export interface ListOptions {
  skip?: number;
  take?: number;
  where?: Record<string, any>;
  orderBy?: Record<string, "asc" | "desc">;
}

export interface ListResult<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}

// Specific Repository Interfaces
export interface IUserRepository extends IRepository<User, any, any> {
  findByEmail(email: string): Promise<User | null>;
  findByFirmId(firmId: string, options?: ListOptions): Promise<ListResult<User>>;
  findActiveUsers(firmId: string): Promise<User[]>;
}

export interface IInquiryRepository extends IRepository<Inquiry, any, any> {
  findByFirmId(firmId: string, options?: ListOptions): Promise<ListResult<Inquiry>>;
  findByStatus(firmId: string, status: string, options?: ListOptions): Promise<ListResult<Inquiry>>;
  findByOwner(userId: string, options?: ListOptions): Promise<ListResult<Inquiry>>;
  findRecentByFirm(firmId: string, days?: number): Promise<Inquiry[]>;
  findByStatusAndUpdated(firmId: string, status: string, since: Date): Promise<Inquiry[]>;
}

export interface ICandidateRepository
  extends IRepository<GoodsCandidate, any, any> {
  findByCandidateRun(candidateRunId: string): Promise<GoodsCandidate[]>;
  findSelectedByRun(candidateRunId: string): Promise<GoodsCandidate[]>;
  updateSortOrder(
    candidateId: string,
    newOrder: number
  ): Promise<GoodsCandidate>;
}

export interface ICandidateRunRepository extends IRepository<CandidateRun, any, any> {
  findByInquiry(inquiryId: string): Promise<CandidateRun[]>;
  getLatestByInquiry(inquiryId: string): Promise<CandidateRun | null>;
  findByState(state: string): Promise<CandidateRun[]>;
}

export interface ISearchJobRepository extends IRepository<SearchJob, any, any> {
  findByInquiry(inquiryId: string): Promise<SearchJob[]>;
  findByState(state: string, options?: ListOptions): Promise<ListResult<SearchJob>>;
  findPendingJobs(limit?: number): Promise<SearchJob[]>;
}

export interface ISearchResultRepository
  extends IRepository<SearchResult, any, any> {
  findBySearchJob(searchJobId: string): Promise<SearchResult[]>;
  findShortlistedByJob(searchJobId: string): Promise<SearchResult[]>;
  bulkCreate(results: any[]): Promise<SearchResult[]>;
}

export interface IReviewReportRepository
  extends IRepository<ReviewReport, any, any> {
  findByInquiry(inquiryId: string): Promise<ReviewReport[]>;
  findLatestByInquiry(inquiryId: string): Promise<ReviewReport | null>;
  findPendingApproval(firmId: string): Promise<ReviewReport[]>;
  findApprovedReports(
    firmId: string,
    since: Date,
    options?: ListOptions
  ): Promise<ListResult<ReviewReport>>;
}
