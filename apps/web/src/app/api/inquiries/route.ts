import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContainer } from "@ip-review/db";
import { processInquiryAttachments } from "@/lib/attachment-processing";

type InquiryCreateBody = Record<string, any>;

function formValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

function formArrayValue(formData: FormData, key: string): string[] {
  const values = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .flatMap((value) => value.split(","));
  return values.map((value) => value.trim()).filter(Boolean);
}

async function readInquiryCreateBody(request: NextRequest): Promise<InquiryCreateBody> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return request.json();
  }

  const formData = await request.formData();
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const attachments = await processInquiryAttachments(files);
  const clientEmail = formValue(formData, "clientEmail");

  return {
    firmId: formValue(formData, "firmId"),
    clientId: formValue(formData, "clientId"),
    inboxAccountId: formValue(formData, "inboxAccountId"),
    ownerUserId: formValue(formData, "ownerUserId"),
    sourceChannel: formValue(formData, "sourceChannel"),
    title: formValue(formData, "title"),
    subject: formValue(formData, "subject"),
    rawText: formValue(formData, "rawText"),
    rawHtml: formValue(formData, "rawHtml"),
    senderEmail: formValue(formData, "senderEmail") ?? clientEmail,
    proposedMarkName: formValue(formData, "proposedMarkName"),
    clientName: formValue(formData, "clientName"),
    companyName: formValue(formData, "companyName"),
    clientEmail,
    handlerName: formValue(formData, "handlerName"),
    handlerDept: formValue(formData, "handlerDept"),
    tags: formArrayValue(formData, "tags"),
    attachmentCount: attachments.length,
    attachments,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await readInquiryCreateBody(request);
    const repositories = getRepositoryContainer();

    // Validate required fields
    if (!body.firmId || !body.title || !body.rawText) {
      return NextResponse.json(
        { error: "Missing required fields: firmId, title, rawText" },
        { status: 400 }
      );
    }

    // Create inquiry with extended metadata
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
      metadata: {
        ...body.metadata,
        clientName: body.clientName,
        companyName: body.companyName,
        clientEmail: body.clientEmail,
        handlerName: body.handlerName,
        handlerDept: body.handlerDept,
        tags: body.tags || [],
        attachmentCount: body.attachmentCount || 0,
        attachments: body.attachments || [],
      },
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
