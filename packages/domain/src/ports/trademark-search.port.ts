import type { SearchSourceSystem, SearchMode } from "../entities/search";

export interface TrademarkSearchRequest {
  sourceSystem: SearchSourceSystem;
  mode: SearchMode;
  params: {
    markName?: string;
    applicantName?: string;
    classNo?: number;
    goodsDescription?: string;
    similarityGroupCode?: string;
    [key: string]: any;
  };
}

export interface TrademarkSearchResponse {
  applicationNumber?: string;
  registerNumber?: string;
  markName: string;
  applicantName?: string;
  classNo?: number;
  designatedGoodsSummary?: string;
  statusLabel?: string;
  sampleImageUrl?: string;
  relevanceScore?: number;
  similarityGroupCodes?: string[];
  rawResponse?: Record<string, any>;
  rawXml?: string;
}

export interface ITrademarkSearchPort {
  search(request: TrademarkSearchRequest): Promise<TrademarkSearchResponse[]>;
  getSourceSystem(): SearchSourceSystem;
  isAvailable(): Promise<boolean>;
  getCacheKey(request: TrademarkSearchRequest): string;
}

export interface TrademarkSearchProvider {
  execute(queries: TrademarkSearchRequest[]): Promise<TrademarkSearchResponse[]>;
  bulkSearch(
    requests: TrademarkSearchRequest[]
  ): Promise<Map<string, TrademarkSearchResponse[]>>;
}
