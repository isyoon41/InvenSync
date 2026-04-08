import { NextRequest, NextResponse } from 'next/server';
import { getRepositoryContainer, prisma } from '@ip-review/db';
import { SearchExecuteWorkflow } from '@ip-review/workflows';
import { createKiprisOnlyTrademarkSearchPort } from '@ip-review/kipris-client';
import { createClaudeOnlyLLMPort } from '@ip-review/llm-engine';

/**
 * POST /api/search-jobs
 * 유사상표 검색 작업 생성 및 실행
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inquiryId, candidateRunId } = body as {
      inquiryId: string;
      candidateRunId?: string;
    };

    if (!inquiryId) {
      return NextResponse.json(
        { error: 'inquiryId는 필수입니다' },
        { status: 400 }
      );
    }

    const repositories = getRepositoryContainer();

    // 의뢰 존재 확인
    const inquiry = await repositories.inquiries.findById(inquiryId);
    if (!inquiry) {
      return NextResponse.json(
        { error: '의뢰를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 이미 검색이 완료된 경우 중복 방지
    if (inquiry.status === 'searched' || inquiry.status === 'reviewed') {
      const existingJobs = await repositories.searchJobs.findByInquiry(inquiryId);
      const doneJob = existingJobs.find((j) => j.state === 'done');
      if (doneJob) {
        return NextResponse.json(
          { message: '이미 검색이 완료된 의뢰입니다', searchJobId: doneJob.id },
          { status: 200 }
        );
      }
    }

    // candidateRunId가 없으면 최신 후보 실행에서 가져오기
    let resolvedCandidateRunId = candidateRunId;
    if (!resolvedCandidateRunId) {
      const latestRun = await prisma.candidateRun.findFirst({
        where: { inquiryId, state: 'done' },
        orderBy: { createdAt: 'desc' },
      });
      resolvedCandidateRunId = latestRun?.id;
    }

    if (!resolvedCandidateRunId) {
      return NextResponse.json(
        { error: '완료된 지정상품 후보 생성 결과가 없습니다. 먼저 지정상품 후보를 생성해 주세요.' },
        { status: 422 }
      );
    }

    const candidates = await repositories.candidates.findByCandidateRun(resolvedCandidateRunId);
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: '지정상품 후보가 비어 있어 유사상표 검색을 시작할 수 없습니다. 지정상품 후보를 다시 생성해 주세요.' },
        { status: 422 }
      );
    }

    // 검색 작업 생성
    const searchJob = await repositories.searchJobs.create({
      inquiryId,
      candidateRunId: resolvedCandidateRunId,
    });

    // 검색 포트 생성 (환경변수 기반으로 실제/목 선택)
    const searchPort = createKiprisOnlyTrademarkSearchPort();
    const llmPort = createClaudeOnlyLLMPort();

    // 검색 워크플로우 실행
    const workflow = new SearchExecuteWorkflow();
    const result = await workflow.execute({
      searchJobId: searchJob.id,
      searchPort,
      llmPort,
    });

    return NextResponse.json({
      searchJobId: result.searchJobId,
      totalCount: result.totalCount,
      executionTimeMs: result.executionTimeMs,
      message: `${result.totalCount}건의 유사상표를 찾았습니다`,
    });
  } catch (error) {
    console.error('POST /api/search-jobs error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '검색 실행 중 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search-jobs
 * 특정 의뢰의 검색 작업 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const repositories = getRepositoryContainer();
    const searchParams = request.nextUrl.searchParams;
    const inquiryId = searchParams.get('inquiryId');

    if (!inquiryId) {
      return NextResponse.json(
        { error: 'inquiryId 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    const jobs = await repositories.searchJobs.findByInquiry(inquiryId);
    return NextResponse.json({ items: jobs, total: jobs.length });
  } catch (error) {
    console.error('GET /api/search-jobs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
