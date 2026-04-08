import { NextRequest, NextResponse } from 'next/server';
import { CandidateGenerateWorkflow } from '@ip-review/workflows';
import { getRepositoryContainer } from '@ip-review/db';
import { createClaudeOnlyLLMPort, type SimilarGoodsLookupPort } from '@ip-review/llm-engine';
import { KiprisAdapter } from '@ip-review/kipris-client';

function createKiprisSimilarGoodsPort(): SimilarGoodsLookupPort {
  if (process.env.TRADEMARK_PROVIDER_MODE !== 'kipris') {
    throw new Error('TRADEMARK_PROVIDER_MODE=kipris is required for designated-goods generation');
  }
  if (!process.env.KIPRIS_API_KEY) {
    throw new Error('KIPRIS_API_KEY is required for designated-goods generation');
  }

  return new KiprisAdapter(process.env.KIPRIS_API_KEY);
}

/**
 * POST /api/inquiries/[id]/process
 * 지정상품 후보 생성 — Gemini LLM으로 류·상품명 추천
 * (상태: parsed → candidate_ready)
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

    if (inquiry.status !== 'parsed') {
      return NextResponse.json(
        { error: `지정상품 설계는 '정규화 완료' 상태에서만 가능합니다. 현재 상태: ${inquiry.status}` },
        { status: 422 }
      );
    }

    const llmPort = createClaudeOnlyLLMPort();

    const workflow = new CandidateGenerateWorkflow(repositories);
    const result = await workflow.execute({
      inquiryId: params.id,
      llmPort,
      similarGoodsPort: createKiprisSimilarGoodsPort(),
    });

    return NextResponse.json({
      success: true,
      candidateRunId: result.candidateRunId,
      totalCount: result.totalCount,
      message: `${result.totalCount}개의 지정상품 후보가 생성되었습니다`,
    });
  } catch (error) {
    console.error('POST /api/inquiries/[id]/process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '후보 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inquiries/[id]/process
 * 의뢰 처리 현황 조회
 */
export async function GET(
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

    const searchJobs = await repositories.searchJobs.findByInquiry(params.id);
    const reviewReports = await repositories.reviewReports.findByInquiry(params.id);

    return NextResponse.json({
      inquiry,
      searchJobs: searchJobs.length,
      reviewReports: reviewReports.length,
      latestReport: reviewReports[0] ?? null,
    });
  } catch (error) {
    console.error('GET /api/inquiries/[id]/process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
