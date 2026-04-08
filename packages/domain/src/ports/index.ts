export type { ITrademarkSearchPort, TrademarkSearchRequest, TrademarkSearchResponse, TrademarkSearchProvider } from "./trademark-search.port";
export type { IGoodsTermPort, GoodsTermMatch } from "./goods-term.port";
export type {
  ILLMPort,
  ParsedInquiryData,
  LLMParseRequest,
  LLMAttachmentContext,
  LLMAttachmentKind,
  LLMAttachmentStatus,
  CandidateGenerationRequest,
  CandidateReferenceGoods,
  GeneratedCandidate,
  ReportGenerationRequest,
  GeneratedReport,
} from "./llm.port";
export type { IInboxPort, InboxMessage, InboxAttachment, InboxFetchOptions, InboxFetchResult, InboxCredentials } from "./inbox.port";
export type { IRepository, ListOptions, ListResult, IUserRepository, IInquiryRepository, ICandidateRepository, ICandidateRunRepository, ISearchJobRepository, ISearchResultRepository, IReviewReportRepository } from "./repository.port";
