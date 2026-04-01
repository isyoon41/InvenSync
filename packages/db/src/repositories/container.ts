import type { IInquiryRepository, ICandidateRepository, ISearchJobRepository, ISearchResultRepository, IReviewReportRepository } from "@ip-review/domain";
import { InquiryRepository } from "./inquiry.repository";
import { CandidateRepository } from "./candidate.repository";
import { SearchJobRepository } from "./search-job.repository";
import { SearchResultRepository } from "./search-result.repository";
import { ReviewReportRepository } from "./review-report.repository";

export interface RepositoryContainer {
  inquiries: IInquiryRepository;
  candidates: ICandidateRepository;
  searchJobs: ISearchJobRepository;
  searchResults: ISearchResultRepository;
  reviewReports: IReviewReportRepository;
}

let containerInstance: RepositoryContainer | null = null;

export function createRepositoryContainer(): RepositoryContainer {
  return {
    inquiries: new InquiryRepository(),
    candidates: new CandidateRepository(),
    searchJobs: new SearchJobRepository(),
    searchResults: new SearchResultRepository(),
    reviewReports: new ReviewReportRepository(),
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
