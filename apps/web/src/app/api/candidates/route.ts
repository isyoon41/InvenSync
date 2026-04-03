import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContainer, prisma } from "@ip-review/db";

export async function GET(request: NextRequest) {
  try {
    const repositories = getRepositoryContainer();
    const searchParams = request.nextUrl.searchParams;

    const candidateRunId = searchParams.get("candidateRunId");
    const inquiryId = searchParams.get("inquiryId");
    const selectedOnly = searchParams.get("selectedOnly") === "true";

    // inquiryId로 조회 시 → 최신 candidateRun의 후보 반환
    if (inquiryId && !candidateRunId) {
      const latestRun = await prisma.candidateRun.findFirst({
        where: { inquiryId, state: "done" },
        orderBy: { createdAt: "desc" },
      });
      if (!latestRun) {
        return NextResponse.json({ items: [], total: 0 });
      }
      const candidates = selectedOnly
        ? await repositories.candidates.findSelectedByRun(latestRun.id)
        : await repositories.candidates.findByCandidateRun(latestRun.id);
      return NextResponse.json({ items: candidates, total: candidates.length, candidateRunId: latestRun.id });
    }

    if (!candidateRunId) {
      return NextResponse.json(
        { error: "Missing required parameter: candidateRunId or inquiryId" },
        { status: 400 }
      );
    }

    const candidates = selectedOnly
      ? await repositories.candidates.findSelectedByRun(candidateRunId)
      : await repositories.candidates.findByCandidateRun(candidateRunId);

    return NextResponse.json({ items: candidates, total: candidates.length });
  } catch (error) {
    console.error("GET /api/candidates error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
