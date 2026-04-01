import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContainer } from "@ip-review/db";
import { NotFoundError } from "@ip-review/domain";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repositories = getRepositoryContainer();
    const result = await repositories.searchResults.findById(params.id);

    if (!result) {
      return NextResponse.json(
        { error: `Search result ${params.id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/search-results/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const repositories = getRepositoryContainer();

    const result = await repositories.searchResults.update(params.id, {
      isShortlisted: body.isShortlisted,
      relevanceScore: body.relevanceScore,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    console.error("PATCH /api/search-results/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
