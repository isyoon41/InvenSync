import { NextRequest, NextResponse } from 'next/server';
import { getRepositoryContainer } from '@ip-review/db';

/**
 * GET /api/search-jobs/[id]
 * 검색 작업 상태 및 결과 조회
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repositories = getRepositoryContainer();

    const job = await repositories.searchJobs.findById(params.id);
    if (!job) {
      return NextResponse.json(
        { error: '검색 작업을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const results = await repositories.searchResults.findBySearchJob(params.id);

    return NextResponse.json({
      ...job,
      resultCount: results.length,
    });
  } catch (error) {
    console.error('GET /api/search-jobs/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
