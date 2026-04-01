import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContainer } from "@ip-review/db";
import { ValidationError } from "@ip-review/domain";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const repositories = getRepositoryContainer();

    // Validate required fields
    if (!body.firmId || !body.title || !body.rawText) {
      return NextResponse.json(
        { error: "Missing required fields: firmId, title, rawText" },
        { status: 400 }
      );
    }

    // Create inquiry
    const inquiry = await repositories.inquiries.create({
      firmId: body.firmId,
      clientId: body.clientId,
      inboxAccountId: body.inboxAccountId,
      ownerUserId: body.ownerUserId,
      sourceChannel: body.sourceChannel || "manual",
      title: body.title,
      subject: body.subject,
      rawText: body.rawText,
      rawHtml: body.rawHtml,
      senderEmail: body.senderEmail,
      proposedMarkName: body.proposedMarkName,
      metadata: body.metadata,
    });

    return NextResponse.json(inquiry, { status: 201 });
  } catch (error) {
    console.error("POST /api/inquiries error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const repositories = getRepositoryContainer();
    const searchParams = request.nextUrl.searchParams;

    const firmId = searchParams.get("firmId");
    const status = searchParams.get("status");
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "20");

    if (!firmId) {
      return NextResponse.json(
        { error: "Missing required parameter: firmId" },
        { status: 400 }
      );
    }

    let result;
    if (status) {
      result = await repositories.inquiries.findByStatus(firmId, status, {
        skip,
        take,
      });
    } else {
      result = await repositories.inquiries.findByFirmId(firmId, {
        skip,
        take,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/inquiries error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
