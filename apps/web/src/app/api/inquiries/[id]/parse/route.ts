import { NextRequest, NextResponse } from 'next/server';
import { InquiryParseWorkflow } from '@ip-review/workflows';
import { getRepositoryContainer } from '@ip-review/db';
import { createClaudeOnlyLLMPort } from '@ip-review/llm-engine';

/**
 * POST /api/inquiries/[id]/parse
 * 의뢰 정규화 — Gemini LLM으로 상표명·지정상품 추출
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repositories = getRepositoryContainer();

    const inquiry = await repositories.inquiries.findById(params.id);
    if (!inquiry) {
      return NextResponse.json(
        { error: `의뢰 ${params.id}를 찾을 수 없습니다` },
        { status: 404 }
      );
    }

    if (inquiry.status !== 'new') {
      return NextResponse.json(
        { error: `정규화는 '신규' 상태에서만 가능합니다. 현재 상태: ${inquiry.status}` },
        { status: 422 }
      );
    }

    const llmPort = createClaudeOnlyLLMPort();

    const workflow = new InquiryParseWorkflow(repositories);
    const result = await workflow.execute({
      inquiryId: params.id,
      llmPort,
    });

    return NextResponse.json({
      success: true,
      inquiry: result.inquiry,
      parsedData: result.parsedData,
      markNameNormalized: result.markNameNormalized,
      goodsDescription: result.goodsDescription,
    });
  } catch (error) {
    console.error('POST /api/inquiries/[id]/parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '정규화 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
