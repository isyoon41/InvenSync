import { NextRequest, NextResponse } from 'next/server';
import { getRepositoryContainer } from '@ip-review/db';
import { ReportGenerateWorkflow } from '@ip-review/workflows';
import { createLLMPort } from '@ip-review/llm-engine';

/**
 * POST /api/review-reports
 * 검토 리포트 자동 생성 — Gemini LLM 분석
 * (상태: searched → reviewed)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inquiryId, searchJobId, manualNotes } = body as {
      inquiryId: string;
      searchJobId?: string;
      manualNotes?: string;
    };

    if (!inquiryId) {
      return NextResponse.json(
        { error: 'inquiryId는 필수입니다' },
        { status: 400 }
      );
    }

    const repositories = getRepositoryContainer();

    // 의뢰 확인
    const inquiry = await repositories.inquiries.findById(inquiryId);
    if (!inquiry) {
      return NextResponse.json(
        { error: '의뢰를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (inquiry.status !== 'searched') {
      return NextResponse.json(
        { error: `검토 리포트는 '검색 완료' 상태에서만 생성 가능합니다. 현재 상태: ${inquiry.status}` },
        { status: 422 }
      );
    }

    // searchJobId 없으면 최신 완료 작업에서 가져오기
    let resolvedSearchJobId = searchJobId;
    if (!resolvedSearchJobId) {
      const jobs = await repositories.searchJobs.findByInquiry(inquiryId);
      const doneJob = jobs.find((j) => j.state === 'done');
      if (!doneJob) {
        return NextResponse.json(
          { error: '완료된 검색 작업이 없습니다. 먼저 유사상표 검색을 실행하세요.' },
          { status: 422 }
        );
      }
      resolvedSearchJobId = doneJob.id;
    }

    const llmPort = createLLMPort();

    const workflow = new ReportGenerateWorkflow(repositories);
    const result = await workflow.execute({
      inquiryId,
      searchJobId: resolvedSearchJobId,
      llmPort,
      manualNotes,
    });

    return NextResponse.json({
      success: true,
      reviewReportId: result.reviewReportId,
      reviewReport: result.reviewReport,
      message: '검토 리포트가 생성되었습니다',
    });
  } catch (error) {
    console.error('POST /api/review-reports error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '리포트 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/review-reports
 * 검토 리포트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const repositories = getRepositoryContainer();
    const searchParams = request.nextUrl.searchParams;

    const inquiryId = searchParams.get('inquiryId');
    const firmId = searchParams.get('firmId');
    const pendingApproval = searchParams.get('pendingApproval') === 'true';
    const skip = parseInt(searchParams.get('skip') ?? '0');
    const take = parseInt(searchParams.get('take') ?? '20');

    if (inquiryId) {
      const reports = await repositories.reviewReports.findByInquiry(inquiryId);
      return NextResponse.json({ items: reports, total: reports.length });
    }

    if (firmId && pendingApproval) {
      const reports = await repositories.reviewReports.findPendingApproval(firmId);
      return NextResponse.json({ items: reports, total: reports.length });
    }

    if (firmId) {
      const since = searchParams.get('since');
      const sinceDate = since
        ? new Date(since)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await repositories.reviewReports.findApprovedReports(
        firmId,
        sinceDate,
        { skip, take }
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'inquiryId 또는 firmId 파라미터가 필요합니다' },
      { status: 400 }
    );
  } catch (error) {
    console.error('GET /api/review-reports error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
