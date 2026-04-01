import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContainer } from "@ip-review/db";

export async function GET(request: NextRequest) {
  try {
    const repositories = getRepositoryContainer();
    const searchParams = request.nextUrl.searchParams;

    const candidateRunId = searchParams.get("candidateRunId");
    const selectedOnly = searchParams.get("selectedOnly") === "true";

    if (!candidateRunId) {
      return NextResponse.json(
        { error: "Missing required parameter: candidateRunId" },
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
