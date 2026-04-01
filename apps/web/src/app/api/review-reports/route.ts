import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContainer } from "@ip-review/db";

export async function GET(request: NextRequest) {
  try {
    const repositories = getRepositoryContainer();
    const searchParams = request.nextUrl.searchParams;

    const inquiryId = searchParams.get("inquiryId");
    const firmId = searchParams.get("firmId");
    const pendingApproval = searchParams.get("pendingApproval") === "true";
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "20");

    if (inquiryId) {
      // Get reports for specific inquiry
      const reports = await repositories.reviewReports.findByInquiry(inquiryId);
      return NextResponse.json({ items: reports, total: reports.length });
    }

    if (firmId && pendingApproval) {
      // Get pending approval reports for firm
      const reports = await repositories.reviewReports.findPendingApproval(firmId);
      return NextResponse.json({ items: reports, total: reports.length });
    }

    if (firmId) {
      // Get approved reports for firm since date
      const since = searchParams.get("since");
      const sinceDate = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await repositories.reviewReports.findApprovedReports(
        firmId,
        sinceDate,
        { skip, take }
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Missing required parameter: inquiryId or firmId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("GET /api/review-reports error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
