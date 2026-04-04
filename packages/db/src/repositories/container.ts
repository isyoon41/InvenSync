import type { IInquiryRepository, ICandidateRepository, ISearchJobRepository, ISearchResultRepository, IReviewReportRepository, IGoodsTermPort } from "@ip-review/domain";
import { InquiryRepository } from "./inquiry.repository";
import { CandidateRepository } from "./candidate.repository";
import { SearchJobRepository } from "./search-job.repository";
import { SearchResultRepository } from "./search-result.repository";
import { ReviewReportRepository } from "./review-report.repository";
import { GoodsTermRepository } from "./goods-term.repository";

export interface RepositoryContainer {
  inquiries: IInquiryRepository;
  candidates: ICandidateRepository;
  searchJobs: ISearchJobRepository;
  searchResults: ISearchResultRepository;
  reviewReports: IReviewReportRepository;
  goodsTerms: IGoodsTermPort;
}

let containerInstance: RepositoryContainer | null = null;

export function createRepositoryContainer(): RepositoryContainer {
  return {
    inquiries: new InquiryRepository(),
    candidates: new CandidateRepository(),
    searchJobs: new SearchJobRepository(),
    searchResults: new SearchResultRepository(),
    reviewReports: new ReviewReportRepository(),
    goodsTerms: new GoodsTermRepository(),
  };
}

export function getRepositoryContainer(): RepositoryContainer {
  if (!containerInstance) {
    containerInstance = createRepositoryContainer();
  }
  return containerInstance;
}

export function resetRepositoryContainer(): void {
  containerInstance = null;
}
