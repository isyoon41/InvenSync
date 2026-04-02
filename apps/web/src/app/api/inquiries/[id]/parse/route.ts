import { NextRequest, NextResponse } from "next/server";
import { InquiryParseWorkflow } from "@ip-review/workflows";
import { getRepositoryContainer } from "@ip-review/db";

// Simple LLM Port implementation using Claude
class ClaudeLLMPort {
  async parseInquiry(request: {
    title: string;
    rawText: string;
    rawHtml?: string;
    senderEmail?: string;
    proposedMarkName?: string;
  }) {
    // For now, return a mock response
    // In production, this would call the Claude API
    // Environment variable ANTHROPIC_API_KEY must be set
    return {
      markNameNormalized: request.proposedMarkName || "UNKNOWN_MARK",
      goodsDescriptionNormalized: request.rawText?.substring(0, 200) || "",
      industry: "general",
      confidence: 0.8,
      missingFields: [],
      reasoning: "Parsed from user input",
    };
  }

  async generateCandidates() {
    return [];
  }

  async generateReport() {
    return {
      summary: "",
      riskNote: "",
      recommendation: "",
      clientReplyDraft: "",
    };
  }

  async isAvailable() {
    return true;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repositories = getRepositoryContainer();

    // Verify inquiry exists
    const inquiry = await repositories.inquiries.findById(params.id);
    if (!inquiry) {
      return NextResponse.json(
        { error: `Inquiry ${params.id} not found` },
        { status: 404 }
      );
    }

    // Check if inquiry is in 'new' status
    if (inquiry.status !== "new") {
      return NextResponse.json(
        { error: `Inquiry must be in 'new' status, current status: ${inquiry.status}` },
        { status: 422 }
      );
    }

    // Use Claude LLM provider
    const llmPort = new ClaudeLLMPort();

    // Run the parse workflow
    const workflow = new InquiryParseWorkflow(repositories);
    const result = await workflow.execute({
      inquiryId: params.id,
      llmPort: llmPort as any,
    });

    return NextResponse.json(
      {
        success: true,
        inquiry: result.inquiry,
        parsedData: result.parsedData,
        markNameNormalized: result.markNameNormalized,
        goodsDescription: result.goodsDescription,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/inquiries/[id]/parse error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && error.message.includes("not found") ? 404 : 500 }
    );
  }
}
