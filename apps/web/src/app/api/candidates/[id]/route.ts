import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContainer } from "@ip-review/db";
import { NotFoundError } from "@ip-review/domain";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repositories = getRepositoryContainer();
    const candidate = await repositories.candidates.findById(params.id);

    if (!candidate) {
      return NextResponse.json(
        { error: `Candidate ${params.id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error("GET /api/candidates/[id] error:", error);
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

    const candidate = await repositories.candidates.update(params.id, {
      isSelected: body.isSelected,
      confidence: body.confidence,
      sortOrder: body.sortOrder,
      rationale: body.rationale,
    });

    return NextResponse.json(candidate);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    console.error("PATCH /api/candidates/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
