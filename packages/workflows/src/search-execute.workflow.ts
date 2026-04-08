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

// 후보의 유사군 코드 추출 (domain 타입 필드 또는 Prisma relation 객체 모두 지원)
function getSimilarityCode(candidate: GoodsCandidate): string | undefined {
  if (candidate.similarityGroupCodes?.[0]) return candidate.similarityGroupCodes[0];
  const groups = (candidate as any).similarityGroups as
    | Array<{ similarityGroupCode: string; isPrimary?: boolean }>
    | undefined;
  if (!groups || groups.length === 0) return undefined;
  // isPrimary 코드 우선, 없으면 첫 번째
  return (groups.find((g) => g.isPrimary) ?? groups[0]).similarityGroupCode;
}

function getSearchResultSimilarityCodes(result: any): string[] {
  if (Array.isArray(result.similarityGroupCodes)) return result.similarityGroupCodes;
  if (Array.isArray(result.rawResponse?.similarityCodes)) return result.rawResponse.similarityCodes;
  return [];
}

// 후보 1개에 대해 실행할 검색 요청 목록 생성
function buildSearchRequests(candidate: GoodsCandidate, markName: string): TrademarkSearchRequest[] {
  const requests: TrademarkSearchRequest[] = [];

  // 1) 정확 상표명 검색 (항상 실행)
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

  // 2) 유사군 코드 검색 (코드가 있는 경우에만)
  const simCode = getSimilarityCode(candidate);
  if (simCode) {
    requests.push({
      sourceSystem: "kipris",
      mode: "similarity_group",
      params: { similarityGroupCode: simCode, classNo: candidate.classNo },
    });
  }

  // 3) 지정상품 키워드 검색 (항상 실행 — normalizedTerm 우선)
  const goodsKeyword = candidate.normalizedTerm?.trim() || candidate.term;
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

      // Update search job state to running
      await this.repositories.searchJobs.update(searchJob.id, {
        state: "running",
      });

      // 선택된 후보 우선, 없으면 전체 후보 폴백 (isSelected 미설정 상태 대응)
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

      // 최대 5개 후보 × 최대 4개 모드 = 최대 20 API 호출 (KIPRIS 월 1,000건 한도 내)
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

      // 중복 방지: searchJobId 내에서 동일 applicationNumber가 이미 저장된 경우 스킵
      const storedAppNumbers = new Set<string>();

      for (const candidate of searchCandidates) {
        const searchRequests = buildSearchRequests(candidate, searchMarkName);

        for (const searchReq of searchRequests) {
          let searchResults;
          try {
            searchResults = await request.searchPort.search(searchReq);
          } catch (err) {
            console.warn(
              `[SearchExecuteWorkflow] 검색 실패 (mode=${searchReq.mode}, candidate=${candidate.term}):`,
              err
            );
            continue; // 한 모드가 실패해도 나머지 모드는 계속 실행
          }

          for (const result of searchResults) {
            // 같은 출원번호는 동일 Job 내에서 중복 저장하지 않음
            const dedupKey = result.applicationNumber ?? `${result.markName}::${result.applicantName}`;
            if (storedAppNumbers.has(dedupKey)) continue;
            storedAppNumbers.add(dedupKey);

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
                detailJson: result.rawResponse,
                rawXml: result.rawXml,
              },
            });
            const similarityGroupCodes = getSearchResultSimilarityCodes(result);
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

      // Update search job state to done
      await this.repositories.searchJobs.update(searchJob.id, {
        state: "done",
        completedAt: new Date(),
      });

      // Update inquiry status
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
