import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContainer } from "@ip-review/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const repositories = getRepositoryContainer();
    const searchParams = request.nextUrl.searchParams;

    const searchJobId = searchParams.get("searchJobId");
    const shortlistedOnly = searchParams.get("shortlistedOnly") === "true";

    if (!searchJobId) {
      return NextResponse.json(
        { error: "Missing required parameter: searchJobId" },
        { status: 400 }
      );
    }

    const results = shortlistedOnly
      ? await repositories.searchResults.findShortlistedByJob(searchJobId)
      : await repositories.searchResults.findBySearchJob(searchJobId);

    return NextResponse.json({ items: results, total: results.length });
  } catch (error) {
    console.error("GET /api/search-results error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
