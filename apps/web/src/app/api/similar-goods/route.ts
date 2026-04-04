import { NextRequest, NextResponse } from 'next/server';
import { KiprisAdapter } from '@ip-review/kipris-client';
import { MockTrademarkAdapter } from '@ip-review/kipris-client';

/**
 * GET /api/similar-goods?query=단어장앱&classNo=9
 * KIPRIS 유사상품군 검색
 * - TRADEMARK_PROVIDER_MODE=kipris 이면 실제 API 호출
 * - 아니면 목 데이터 반환
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query   = searchParams.get('query')?.trim();
  const classNo = searchParams.get('classNo');

  if (!query) {
    return NextResponse.json(
      { error: 'query 파라미터가 필요합니다' },
      { status: 400 }
    );
  }

  const mode      = process.env.TRADEMARK_PROVIDER_MODE ?? 'mock';
  const accessKey = process.env.KIPRIS_API_KEY;

  if (mode !== 'kipris' || !accessKey) {
    // mock 데이터
    return NextResponse.json({
      query,
      items: [
        { goodsName: `${query} (목 데이터)`, similarCode: 'G0901', classNo: '09' },
        { goodsName: '컴퓨터 소프트웨어',    similarCode: 'G0901', classNo: '09' },
        { goodsName: '모바일 애플리케이션',  similarCode: 'G0901', classNo: '09' },
      ],
      totalCount: 3,
      source: 'mock',
    });
  }

  try {
    const adapter = new KiprisAdapter(accessKey);
    const items = await adapter.searchSimilarGoods(
      query,
      classNo ? parseInt(classNo, 10) : undefined
    );

    return NextResponse.json({
      query,
      items,
      totalCount: items.length,
      source: 'kipris',
    });
  } catch (error) {
    console.error('GET /api/similar-goods error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '유사상품 검색 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
