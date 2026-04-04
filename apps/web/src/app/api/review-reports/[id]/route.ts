import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContainer } from "@ip-review/db";
import { NotFoundError } from "@ip-review/domain";
import { prisma } from "@ip-review/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repositories = getRepositoryContainer();
    const report = await repositories.reviewReports.findById(params.id);

    if (!report) {
      return NextResponse.json(
        { error: `Review report ${params.id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("GET /api/review-reports/[id] error:", error);
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

    const report = await repositories.reviewReports.update(params.id, {
      summary: body.summary,
      riskNote: body.riskNote,
      recommendation: body.recommendation,
      clientReplyDraft: body.clientReplyDraft,
      internalNote: body.internalNote,
    });

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    console.error("PATCH /api/review-reports/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.reviewReport.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/review-reports/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "approve") {
      const body = await request.json();
      const report = await prisma.reviewReport.update({
        where: { id: params.id },
        data: {
          approvedByUserId: body.approvedByUserId,
          approvedAt: new Date(),
        },
        include: { evidences: true },
      });

      return NextResponse.json(report);
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/review-reports/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
