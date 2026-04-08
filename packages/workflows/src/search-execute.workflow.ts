import type {
  ILLMPort,
  ITrademarkSearchPort,
  SearchResult,
  GoodsCandidate,
  ParsedNormalizedGood,
  TrademarkSearchRequest,
  TrademarkSearchTermStrategy,
} from "@ip-review/domain";
import { ValidationError, InquiryProcessingError } from "@ip-review/domain";
import { getRepositoryContainer } from "@ip-review/db";
import { prisma } from "@ip-review/db";

export interface SearchExecuteRequest {
  searchJobId: string;
  searchPort: ITrademarkSearchPort;
  llmPort: ILLMPort;
  candidateIds?: string[];
}

export interface SearchExecuteResult {
  searchJobId: string;
  results: SearchResult[];
  totalCount: number;
  executionTimeMs: number;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value))
  );
}

function getSimilarityCodes(candidate: GoodsCandidate): string[] {
  const directCodes = candidate.similarityGroupCodes ?? [];
  const groups = (candidate as any).similarityGroups as
    | Array<{ similarityGroupCode: string; isPrimary?: boolean }>
    | undefined;
  if (!groups || groups.length === 0) return uniqueStrings(directCodes).slice(0, 3);

  const primary = groups.find((g) => g.isPrimary)?.similarityGroupCode;
  const relationCodes = groups.map((g) => g.similarityGroupCode);
  return uniqueStrings([primary, ...directCodes, ...relationCodes]).slice(0, 3);
}

function getSearchResultSimilarityCodes(
  result: any,
  searchReq?: TrademarkSearchRequest
): string[] {
  if (Array.isArray(result.similarityGroupCodes) && result.similarityGroupCodes.length > 0) {
    return uniqueStrings(result.similarityGroupCodes);
  }

  return uniqueStrings([
    ...(Array.isArray(result.rawResponse?.similarityCodes) ? result.rawResponse.similarityCodes : []),
    result.rawResponse?.querySimilarityGroupCode,
    searchReq?.params.similarityGroupCode,
  ]);
}

function buildKiprisTrademarkUrl(applicationNumber?: string, markName?: string): string {
  if (applicationNumber) {
    return `https://doi.kipris.or.kr/kdoi/searchKdoiInfoReadView.do?applno=${encodeURIComponent(applicationNumber)}`;
  }
  if (markName) {
    return `https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark&query=${encodeURIComponent(markName)}`;
  }
  return "https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark";
}

function buildSearchBasis(
  searchReq: TrademarkSearchRequest,
  candidate: GoodsCandidate,
  result: SearchResult,
  strategy: TrademarkSearchTermStrategy
): string {
  const classLabel = candidate.classNo ? `제${String(candidate.classNo).padStart(2, "0")}류` : "해당 류";
  const searchedTerm = String(searchReq.params.markName ?? strategy.primarySearchTerm);
  const score = result.relevanceScore !== undefined
    ? ` 표장명 유사도는 약 ${Math.round(result.relevanceScore * 100)}%입니다.`
    : "";
  const exclusion = strategy.excludedTerms.length > 0
    ? ` 제외 요소: ${strategy.excludedTerms.map((item) => `${item.term}(${item.reason})`).join(", ")}.`
    : "";

  if (searchReq.mode === "similarity_group") {
    return `${classLabel} 후보 "${candidate.term}"의 유사군 코드 ${searchReq.params.similarityGroupCode} 범위에서, Claude가 정규화 상표명 "${strategy.originalMarkName}" 중 식별력 있는 핵심 검색어를 "${searchedTerm}"으로 판단해 KIPRIS로 조회한 결과입니다.${exclusion}${score}`;
  }
  if (searchReq.mode === "exact_mark") {
    return `${classLabel}에서 Claude가 선정한 검색어 "${searchedTerm}"과 동일 표장 검색으로 확인한 KIPRIS 결과입니다.${exclusion}${score}`;
  }
  if (searchReq.mode === "mark_keyword") {
    return `${classLabel}에서 Claude가 선정한 검색어 "${searchedTerm}"을 키워드로 확장 조회한 KIPRIS 결과입니다.${exclusion}${score}`;
  }
  if (searchReq.mode === "designated_goods") {
    return `${classLabel} 후보 지정상품 "${candidate.normalizedTerm ?? candidate.term}"을 기준으로 KIPRIS 지정상품 검색에서 확인한 결과입니다.${score}`;
  }
  return `${classLabel} 후보 "${candidate.term}"과 Claude 검색어 "${searchedTerm}"을 기준으로 확인한 KIPRIS 결과입니다.${score}`;
}

function buildSearchRequests(
  candidate: GoodsCandidate,
  strategy: TrademarkSearchTermStrategy
): TrademarkSearchRequest[] {
  const requests: TrademarkSearchRequest[] = [];
  const goodsKeyword = candidate.normalizedTerm?.trim() || candidate.term;
  const primaryTerm = compactSearchMark(strategy.primarySearchTerm || strategy.originalMarkName);
  const alternativeTerms = uniqueStrings(strategy.alternativeSearchTerms)
    .filter((term) => term !== primaryTerm)
    .slice(0, 2);
  const markTerms = uniqueStrings([primaryTerm, ...alternativeTerms]).slice(0, 3);

  for (const simCode of getSimilarityCodes(candidate)) {
    for (const [index, markName] of markTerms.entries()) {
      requests.push({
        sourceSystem: "kipris",
        mode: "similarity_group",
        params: {
          markName,
          originalMarkName: strategy.originalMarkName,
          searchTermRole: index === 0 ? "primary" : "alternative",
          similarityGroupCode: simCode,
          classNo: candidate.classNo,
          goodsDescription: goodsKeyword,
        },
      });
    }
  }

  if (primaryTerm) {
    requests.push({
      sourceSystem: "kipris",
      mode: "exact_mark",
      params: { markName: primaryTerm, classNo: candidate.classNo },
    });
    requests.push({
      sourceSystem: "kipris",
      mode: "mark_keyword",
      params: { markName: primaryTerm, classNo: candidate.classNo },
    });
  }

  for (const markName of alternativeTerms.slice(0, 1)) {
    requests.push({
      sourceSystem: "kipris",
      mode: "exact_mark",
      params: { markName, classNo: candidate.classNo },
    });
  }

  requests.push({
    sourceSystem: "kipris",
    mode: "designated_goods",
    params: { goodsDescription: goodsKeyword, classNo: candidate.classNo },
  });

  return requests;
}

function compactSearchMark(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function normalizeTargetClasses(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 45);
}

function normalizeParsedGoods(value: unknown): ParsedNormalizedGood[] {
  if (!Array.isArray(value)) return [];
  const goods: ParsedNormalizedGood[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as Record<string, unknown>;
    const classNo = Number(row.classNo);
    const term = typeof row.term === "string" ? row.term.trim() : "";
    if (!Number.isInteger(classNo) || classNo < 1 || classNo > 45 || !term) continue;
    goods.push({
      classNo,
      term,
      kind: row.kind === "service" ? "service" : "goods",
      basis: typeof row.basis === "string" ? row.basis : undefined,
      evidenceLabel: typeof row.evidenceLabel === "string" ? row.evidenceLabel : undefined,
      evidenceUrl: typeof row.evidenceUrl === "string" ? row.evidenceUrl : undefined,
    });
  }
  return goods;
}

function normalizeSearchStrategy(
  strategy: TrademarkSearchTermStrategy,
  fallbackMarkName: string
): TrademarkSearchTermStrategy {
  const primarySearchTerm = compactSearchMark(strategy.primarySearchTerm || fallbackMarkName);
  return {
    originalMarkName: compactSearchMark(strategy.originalMarkName || fallbackMarkName),
    primarySearchTerm: primarySearchTerm || fallbackMarkName,
    alternativeSearchTerms: uniqueStrings(strategy.alternativeSearchTerms).slice(0, 4),
    excludedTerms: Array.isArray(strategy.excludedTerms) ? strategy.excludedTerms : [],
    reasoning: strategy.reasoning || "Claude가 상표 구성 중 식별력 있는 핵심 부분을 기준으로 검색어를 선정했습니다.",
    confidence: Number.isFinite(strategy.confidence) ? strategy.confidence : 0.7,
  };
}

export class SearchExecuteWorkflow {
  constructor(private repositories = getRepositoryContainer()) {}

  async execute(request: SearchExecuteRequest): Promise<SearchExecuteResult> {
    try {
      const startTime = Date.now();

      const searchJob = await this.repositories.searchJobs.findById(request.searchJobId);
      if (!searchJob) {
        throw new ValidationError(`Search job not found: ${request.searchJobId}`);
      }

      if (searchJob.state !== "queued") {
        throw new InquiryProcessingError(
          searchJob.inquiryId,
          "search_execution",
          `Search job must be in 'queued' state, got '${searchJob.state}'`
        );
      }

      await this.repositories.searchJobs.update(searchJob.id, {
        state: "running",
      });

      let candidates: GoodsCandidate[] = [];
      if (searchJob.candidateRunId) {
        candidates = await this.repositories.candidates.findSelectedByRun(
          searchJob.candidateRunId
        );
        if (candidates.length === 0) {
          candidates = await this.repositories.candidates.findByCandidateRun(
            searchJob.candidateRunId
          );
        }
      }

      if (candidates.length === 0 && !request.candidateIds) {
        throw new InquiryProcessingError(
          searchJob.inquiryId,
          "search_execution",
          "No candidates found to search"
        );
      }

      const [inquiry, parsedRequest] = await Promise.all([
        this.repositories.inquiries.findById(searchJob.inquiryId),
        prisma.parsedRequest.findFirst({
          where: { inquiryId: searchJob.inquiryId, isCurrent: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      const normalizedMarkName = compactSearchMark(
        parsedRequest?.markNameNormalized || inquiry?.proposedMarkName || inquiry?.title
      );
      const parsedJson = (parsedRequest?.parsedJson ?? {}) as Record<string, unknown>;
      const targetClasses = normalizeTargetClasses(parsedJson.targetClasses);
      const normalizedGoods = normalizeParsedGoods(parsedJson.normalizedGoods);
      const strategy = normalizeSearchStrategy(
        await request.llmPort.deriveTrademarkSearchTerms({
          normalizedMarkName,
          proposedMarkName: inquiry?.proposedMarkName ?? undefined,
          goodsDescription: parsedRequest?.goodsDescriptionNormalized ?? inquiry?.rawText ?? undefined,
          targetClasses,
          normalizedGoods,
        }),
        normalizedMarkName
      );

      const searchCandidates = candidates.slice(0, 5);
      const allResults: any[] = [];
      const storedAppNumbers = new Set<string>();

      for (const candidate of searchCandidates) {
        const searchRequests = buildSearchRequests(candidate, strategy);

        for (const searchReq of searchRequests) {
          let searchResults;
          try {
            searchResults = await request.searchPort.search(searchReq);
          } catch (err) {
            console.warn(
              `[SearchExecuteWorkflow] search failed (mode=${searchReq.mode}, candidate=${candidate.term}):`,
              err
            );
            continue;
          }

          for (const result of searchResults) {
            const dedupKey = result.applicationNumber ?? `${result.markName}::${result.applicantName}`;
            if (storedAppNumbers.has(dedupKey)) continue;
            storedAppNumbers.add(dedupKey);

            const similarityGroupCodes = getSearchResultSimilarityCodes(result, searchReq);
            const kiprisUrl = buildKiprisTrademarkUrl(result.applicationNumber, result.markName);
            const searchBasis = buildSearchBasis(
              searchReq,
              candidate,
              result as SearchResult,
              strategy
            );

            const storedResult = await prisma.searchResult.create({
              data: {
                searchJobId: searchJob.id,
                sourceSystem: "kipris",
                mode: searchReq.mode,
                markName: result.markName,
                applicationNumber: result.applicationNumber,
                registerNumber: result.registerNumber,
                applicantName: result.applicantName,
                classNo: result.classNo,
                designatedGoodsSummary: result.designatedGoodsSummary,
                statusLabel: result.statusLabel,
                sampleImageUrl: result.sampleImageUrl,
                relevanceScore: result.relevanceScore,
                detailJson: {
                  ...(result.rawResponse ?? {}),
                  queryContext: {
                    mode: searchReq.mode,
                    normalizedMarkName,
                    claudePrimarySearchTerm: strategy.primarySearchTerm,
                    searchedMarkName: searchReq.params.markName,
                    candidateTerm: candidate.term,
                    normalizedCandidateTerm: candidate.normalizedTerm,
                    classNo: candidate.classNo,
                    similarityGroupCode: searchReq.params.similarityGroupCode,
                    goodsDescription: searchReq.params.goodsDescription,
                  },
                  trademarkSearchStrategy: strategy,
                  similarityCodes: similarityGroupCodes,
                  searchBasis,
                  kiprisUrl,
                } as any,
                rawXml: result.rawXml,
              },
            });

            if (similarityGroupCodes.length > 0) {
              await prisma.searchResultSimilarityGroup.createMany({
                data: similarityGroupCodes.map((similarityGroupCode) => ({
                  searchResultId: storedResult.id,
                  similarityGroupCode,
                })),
              });
            }
            allResults.push(storedResult);
          }
        }
      }

      await this.repositories.searchJobs.update(searchJob.id, {
        state: "done",
        completedAt: new Date(),
      });

      await this.repositories.inquiries.update(searchJob.inquiryId, {
        status: "searched",
      });

      const executionTimeMs = Date.now() - startTime;

      return {
        searchJobId: searchJob.id,
        results: allResults as SearchResult[],
        totalCount: allResults.length,
        executionTimeMs,
      };
    } catch (error) {
      try {
        const latestJob = await this.repositories.searchJobs.findById(request.searchJobId);
        if (latestJob && latestJob.state !== "done") {
          await this.repositories.searchJobs.update(request.searchJobId, {
            state: "failed",
            completedAt: new Date(),
          });
        }
      } catch (updateError) {
        console.warn(
          `[SearchExecuteWorkflow] failed to mark search job ${request.searchJobId} as failed:`,
          updateError
        );
      }

      if (error instanceof ValidationError || error instanceof InquiryProcessingError) {
        throw error;
      }
      throw new InquiryProcessingError(
        request.searchJobId,
        "search_execution",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
