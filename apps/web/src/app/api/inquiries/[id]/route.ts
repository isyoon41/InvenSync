import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContainer } from "@ip-review/db";
import { NotFoundError } from "@ip-review/domain";

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

    return NextResponse.json(inquiry);
  } catch (error) {
    console.error("GET /api/inquiries/[id] error:", error);
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

    const inquiry = await repositories.inquiries.update(params.id, {
      title: body.title,
      subject: body.subject,
      proposedMarkName: body.proposedMarkName,
      status: body.status,
      ownerUserId: body.ownerUserId,
      metadata: body.metadata,
    });

    return NextResponse.json(inquiry);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    console.error("PATCH /api/inquiries/[id] error:", error);
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
    const repositories = getRepositoryContainer();
    await repositories.inquiries.delete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    console.error("DELETE /api/inquiries/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
