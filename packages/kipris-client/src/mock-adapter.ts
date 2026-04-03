/**
 * 개발/테스트용 목(Mock) 어댑터
 * TRADEMARK_PROVIDER_MODE=mock 일 때 사용
 */

import type {
  ITrademarkSearchPort,
  TrademarkSearchRequest,
  TrademarkSearchResponse,
} from '@ip-review/domain';

const MOCK_RESULTS: TrademarkSearchResponse[] = [
  {
    applicationNumber: '4020230012345',
    registerNumber: '4019950012345',
    markName: '스마트싱크',
    applicantName: '주식회사 테크코',
    classNo: 9,
    designatedGoodsSummary: '스마트폰 케이스, 스마트폰 홀더, 이어폰',
    statusLabel: '등록',
    sampleImageUrl: undefined,
    relevanceScore: 0.85,
    rawResponse: { mock: true },
  },
  {
    applicationNumber: '4020220054321',
    registerNumber: undefined,
    markName: '인벤싱크',
    applicantName: '특허법인 인벤싱크',
    classNo: 45,
    designatedGoodsSummary: '상표 출원 대리업, 특허 출원 대리업',
    statusLabel: '출원',
    sampleImageUrl: undefined,
    relevanceScore: 0.72,
    rawResponse: { mock: true },
  },
  {
    applicationNumber: '4020210099999',
    registerNumber: '4020219999999',
    markName: '싱크마스터',
    applicantName: '개인 홍길동',
    classNo: 9,
    designatedGoodsSummary: '컴퓨터 소프트웨어, 데이터 동기화 소프트웨어',
    statusLabel: '등록',
    sampleImageUrl: undefined,
    relevanceScore: 0.61,
    rawResponse: { mock: true },
  },
];

export class MockTrademarkAdapter implements ITrademarkSearchPort {
  getSourceSystem() {
    return 'mock' as const;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getCacheKey(request: TrademarkSearchRequest): string {
    return `mock:${request.mode}:${JSON.stringify(request.params)}`;
  }

  async search(request: TrademarkSearchRequest): Promise<TrademarkSearchResponse[]> {
    // 실제 API처럼 약간의 지연 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 300));

    const { markName, classNo } = request.params;

    return MOCK_RESULTS
      .filter((r) => {
        if (classNo !== undefined && r.classNo !== classNo) return false;
        return true;
      })
      .map((r) => ({
        ...r,
        // 검색어와 결과명이 비슷할수록 높은 유사도
        relevanceScore: markName
          ? Math.min(0.99, (r.relevanceScore ?? 0.5) + Math.random() * 0.1)
          : r.relevanceScore,
      }));
  }
}
