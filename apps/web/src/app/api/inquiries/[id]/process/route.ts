import { NextRequest, NextResponse } from "next/server";
import { InquiryOrchestrator } from "@ip-review/workflows";
import { InquiryProcessingError, ValidationError } from "@ip-review/domain";
import { getRepositoryContainer } from "@ip-review/db";

// Mock implementations for development
class MockLLMPort {
  async parseInquiry() {
    return {
      markNameNormalized: "MOCK_MARK",
      goodsDescriptionNormalized: "Mock goods description",
      industry: "technology",
      confidence: 0.95,
    };
  }

  async generateCandidates() {
    return [
      {
        term: "Mock Term 1",
        normalizedTerm: "MOCK_TERM_1",
        classNo: 3,
        sourceType: "ai_generated" as const,
        confidence: 0.9,
        rationale: "Generated from mark name",
      },
    ];
  }

  async generateReport() {
    return {
      summary: "Mock review summary",
      riskNote: "Mock risk assessment",
      recommendation: "Mock recommendation",
      clientReplyDraft: "Mock client reply",
    };
  }

  async isAvailable() {
    return true;
  }
}

class MockSearchPort {
  async search() {
    return [
      {
        markName: "SIMILAR_MARK",
        applicationNumber: "40-2024-000001",
        registerNumber: "01234567",
        applicantName: "Mock Company",
        classNo: 3,
        statusLabel: "REGISTERED",
        relevanceScore: 0.85,
      },
    ];
  }

  getSourceSystem() {
    return "mock" as const;
  }

  async isAvailable() {
    return true;
  }

  getCacheKey() {
    return "mock-cache-key";
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const repositories = getRepositoryContainer();

    // Verify inquiry exists
    const inquiry = await repositories.inquiries.findById(params.id);
    if (!inquiry) {
      return NextResponse.json(
        { error: `Inquiry ${params.id} not found` },
        { status: 404 }
      );
    }

    // Use mock providers for now
    const llmPort = new MockLLMPort();
    const searchPort = new MockSearchPort();

    const orchestrator = new InquiryOrchestrator(repositories);
    const result = await orchestrator.processInquiryFull(
      params.id,
      llmPort as any,
      searchPort as any
    );

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error.message,
          status: result.status,
          inquiry: result.inquiry,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        status: result.status,
        inquiry: result.inquiry,
        result: result.result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/inquiries/[id]/process error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repositories = getRepositoryContainer();

    const inquiry = await repositories.inquiries.findById(params.id);
    if (!inquiry) {
      return NextResponse.json(
        { error: `Inquiry ${params.id} not found` },
        { status: 404 }
      );
    }

    // Get related data
    const candidateRuns = await repositories.candidates.findByCandidateRun(params.id);
    const searchJobs = await repositories.searchJobs.findByInquiry(params.id);
    const reviewReports = await repositories.reviewReports.findByInquiry(params.id);

    return NextResponse.json({
      inquiry,
      candidateRuns: candidateRuns.length,
      searchJobs: searchJobs.length,
      reviewReports: reviewReports.length,
      latestReport: reviewReports[0] || null,
    });
  } catch (error) {
    console.error("GET /api/inquiries/[id]/process error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
