import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ip-review/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch the latest parsed request for this inquiry
    const parsedRequest = await prisma.parsedRequest.findFirst({
      where: { inquiryId: params.id },
      orderBy: { createdAt: "desc" },
    });

    if (!parsedRequest) {
      return NextResponse.json(
        { error: "No parsed data found for this inquiry" },
        { status: 404 }
      );
    }

    // Return the parsed JSON data
    const parsedData = parsedRequest.parsedJson || {
      markNameNormalized: parsedRequest.markNameNormalized,
      goodsDescriptionNormalized: parsedRequest.goodsDescriptionNormalized,
      industry: parsedRequest.industryGuess,
      missingFields: parsedRequest.missingFields,
      confidence: parsedRequest.confidence,
    };

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("GET /api/inquiries/[id]/parsed-data error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
