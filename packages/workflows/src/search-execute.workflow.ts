import type { ITrademarkSearchPort, SearchResult } from "@ip-review/domain";
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

      // Get candidates to search for
      // 선택된 후보 우선, 없으면 전체 후보 폴백 (isSelected 미설정 상태 대응)
      let candidates: import("@ip-review/domain").GoodsCandidate[] = [];
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

      // Execute search for each candidate (최대 5개 — KIPRIS 할당량 절약)
      const searchCandidates = candidates.slice(0, 5);
      const allResults: any[] = [];
      for (const candidate of searchCandidates) {
        const searchResults = await request.searchPort.search({
          sourceSystem: "kipris",
          mode: "exact_mark",
          params: {
            markName: candidate.term,
            classNo: candidate.classNo,
          },
        });

        // Store results
        for (const result of searchResults) {
          const storedResult = await prisma.searchResult.create({
            data: {
              searchJobId: searchJob.id,
              sourceSystem: "kipris",
              mode: "exact_mark",
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
          allResults.push(storedResult);
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
