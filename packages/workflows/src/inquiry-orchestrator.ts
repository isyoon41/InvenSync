import type { ILLMPort, ITrademarkSearchPort, Inquiry } from "@ip-review/domain";
import { InquiryProcessingError } from "@ip-review/domain";
import { getRepositoryContainer } from "@ip-review/db";
import { InquiryParseWorkflow } from "./inquiry-parse.workflow";
import { CandidateGenerateWorkflow } from "./candidate-generate.workflow";
import { SearchExecuteWorkflow } from "./search-execute.workflow";
import { ReportGenerateWorkflow } from "./report-generate.workflow";
import { prisma } from "@ip-review/db";

export interface InquiryProcessingPipeline {
  inquiry: Inquiry;
  status: "parsing" | "generating_candidates" | "searching" | "generating_report" | "completed";
  result?: any;
  error?: Error;
}

export class InquiryOrchestrator {
  private parseWorkflow: InquiryParseWorkflow;
  private candidateWorkflow: CandidateGenerateWorkflow;
  private searchWorkflow: SearchExecuteWorkflow;
  private reportWorkflow: ReportGenerateWorkflow;

  constructor(private repositories = getRepositoryContainer()) {
    this.parseWorkflow = new InquiryParseWorkflow(repositories);
    this.candidateWorkflow = new CandidateGenerateWorkflow(repositories);
    this.searchWorkflow = new SearchExecuteWorkflow(repositories);
    this.reportWorkflow = new ReportGenerateWorkflow(repositories);
  }

  async processInquiryFull(
    inquiryId: string,
    llmPort: ILLMPort,
    searchPort: ITrademarkSearchPort
  ): Promise<InquiryProcessingPipeline> {
    let inquiry = await this.repositories.inquiries.findById(inquiryId);
    if (!inquiry) {
      throw new Error(`Inquiry not found: ${inquiryId}`);
    }

    try {
      // Step 1: Parse inquiry
      inquiry = (
        await this.parseWorkflow.execute({
          inquiryId,
          llmPort,
        })
      ).inquiry;

      // Step 2: Generate candidates
      const candidateResult = await this.candidateWorkflow.execute({
        inquiryId,
        llmPort,
      });

      // Step 3: Execute search
      const searchJob = await prisma.searchJob.create({
        data: {
          inquiryId,
          candidateRunId: candidateResult.candidateRunId,
          state: "queued",
        },
      });

      const searchResult = await this.searchWorkflow.execute({
        searchJobId: searchJob.id,
        searchPort,
      });

      if (searchResult.results.length === 0) {
        return {
          inquiry,
          status: "searching",
          result: { message: "No similar marks found" },
        };
      }

      // Step 4: Generate report
      const reportResult = await this.reportWorkflow.execute({
        inquiryId,
        searchJobId: searchJob.id,
        llmPort,
      });

      // Update inquiry to approved state
      inquiry = await this.repositories.inquiries.update(inquiryId, {
        status: "approved",
      });

      return {
        inquiry,
        status: "completed",
        result: reportResult,
      };
    } catch (error) {
      return {
        inquiry,
        status: "completed",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async resumeFromParsed(
    inquiryId: string,
    llmPort: ILLMPort,
    searchPort: ITrademarkSearchPort
  ): Promise<InquiryProcessingPipeline> {
    const inquiry = await this.repositories.inquiries.findById(inquiryId);
    if (!inquiry) {
      throw new Error(`Inquiry not found: ${inquiryId}`);
    }

    if (inquiry.status !== "parsed") {
      throw new InquiryProcessingError(
        inquiryId,
        "resume",
        `Can only resume from parsed status, got '${inquiry.status}'`
      );
    }

    return this.processInquiryFull(inquiryId, llmPort, searchPort);
  }

  async cancelProcessing(inquiryId: string): Promise<void> {
    // Cancel any running jobs for this inquiry
    const searchJobs = await this.repositories.searchJobs.findByInquiry(inquiryId);
    for (const job of searchJobs) {
      if (job.state === "running" || job.state === "queued") {
        await this.repositories.searchJobs.update(job.id, {
          state: "failed",
        });
      }
    }

    // Mark inquiry as having failed
    await this.repositories.inquiries.update(inquiryId, {
      status: "new",
    });
  }
}
