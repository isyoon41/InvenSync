import type {
  ITrademarkSearchPort,
  SearchResult,
  GoodsCandidate,
  TrademarkSearchRequest,
} from "@ip-review/domain";
import { ValidationError, InquiryProcessingError } from "@ip-review/domain";
import { getRepositoryContainer } from "@ip-review/db";
import { prisma } from "@ip-review/db";

export interface SearchExecuteRequest {
  searchJobId: string;
  searchPort: ITrademarkSearchPort;
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
  markName: string
): string {
  const classLabel = candidate.classNo ? `제${String(candidate.classNo).padStart(2, "0")}류` : "해당 류";
  const score = result.relevanceScore !== undefined
    ? ` 표장명 유사도는 약 ${Math.round(result.relevanceScore * 100)}%입니다.`
    : "";

  if (searchReq.mode === "similarity_group") {
    return `${classLabel} 후보 "${candidate.term}"의 유사군 코드 ${searchReq.params.similarityGroupCode} 범위에서 정규화 상표명 "${markName}"을 KIPRIS로 조회한 결과입니다.${score}`;
  }
  if (searchReq.mode === "exact_mark") {
    return `${classLabel}에서 정규화 상표명 "${markName}"과 동일 표장 검색으로 확인한 KIPRIS 결과입니다.${score}`;
  }
  if (searchReq.mode === "mark_keyword") {
    return `${classLabel}에서 정규화 상표명 "${markName}"을 키워드로 확장 조회한 KIPRIS 결과입니다.${score}`;
  }
  if (searchReq.mode === "designated_goods") {
    return `${classLabel} 후보 지정상품 "${candidate.normalizedTerm ?? candidate.term}"을 기준으로 KIPRIS 지정상품 검색에서 확인한 결과입니다.${score}`;
  }
  return `${classLabel} 후보 "${candidate.term}"과 정규화 상표명 "${markName}"을 기준으로 확인한 KIPRIS 결과입니다.${score}`;
}

function buildSearchRequests(candidate: GoodsCandidate, markName: string): TrademarkSearchRequest[] {
  const requests: TrademarkSearchRequest[] = [];
  const goodsKeyword = candidate.normalizedTerm?.trim() || candidate.term;

  for (const simCode of getSimilarityCodes(candidate)) {
    requests.push({
      sourceSystem: "kipris",
      mode: "similarity_group",
      params: {
        markName,
        similarityGroupCode: simCode,
        classNo: candidate.classNo,
        goodsDescription: goodsKeyword,
      },
    });
  }

  if (markName) {
    requests.push({
      sourceSystem: "kipris",
      mode: "exact_mark",
      params: { markName, classNo: candidate.classNo },
    });
    requests.push({
      sourceSystem: "kipris",
      mode: "mark_keyword",
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
      const searchMarkName = compactSearchMark(
        parsedRequest?.markNameNormalized || inquiry?.proposedMarkName || inquiry?.title
      );

      const searchCandidates = candidates.slice(0, 5);
      const allResults: any[] = [];
      const storedAppNumbers = new Set<string>();

      for (const candidate of searchCandidates) {
        const searchRequests = buildSearchRequests(candidate, searchMarkName);

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
              searchMarkName
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
                    normalizedMarkName: searchMarkName,
                    candidateTerm: candidate.term,
                    normalizedCandidateTerm: candidate.normalizedTerm,
                    classNo: candidate.classNo,
                    similarityGroupCode: searchReq.params.similarityGroupCode,
                    goodsDescription: searchReq.params.goodsDescription,
                  },
                  similarityCodes: similarityGroupCodes,
                  searchBasis,
                  kiprisUrl,
                },
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
