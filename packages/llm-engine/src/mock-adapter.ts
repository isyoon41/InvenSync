/**
 * 개발/테스트용 Mock LLM 어댑터
 * LLM_PROVIDER_MODE=mock 일 때 사용
 */

import type {
  ILLMPort,
  LLMParseRequest,
  ParsedInquiryData,
  CandidateGenerationRequest,
  GeneratedCandidate,
  ReportGenerationRequest,
  GeneratedReport,
} from '@ip-review/domain';

export class MockLLMAdapter implements ILLMPort {
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async parseInquiry(request: LLMParseRequest): Promise<ParsedInquiryData> {
    await new Promise((r) => setTimeout(r, 200));
    return {
      markNameNormalized: request.proposedMarkName ?? request.title,
      goodsDescriptionNormalized: request.rawText.substring(0, 200),
      industry: '전자기기',
      confidence: 0.85,
      missingFields: [],
      reasoning: '[Mock] 테스트용 파싱 결과',
    };
  }

  async generateCandidates(request: CandidateGenerationRequest): Promise<GeneratedCandidate[]> {
    await new Promise((r) => setTimeout(r, 300));
    return [
      {
        term: '스마트폰 케이스',
        normalizedTerm: '스마트폰 케이스',
        classNo: 9,
        sourceType: 'ai_generated',
        confidence: 0.92,
        rationale: '제안 상표의 주요 상품군에 해당',
      },
      {
        term: '이동통신 단말기용 보호 케이스',
        normalizedTerm: '이동통신 단말기용 보호 케이스',
        classNo: 9,
        sourceType: 'ai_generated',
        confidence: 0.87,
        rationale: '공식 고시 명칭에 근접한 상품명',
      },
      {
        term: '가죽제 지갑',
        normalizedTerm: '가죽제 지갑',
        classNo: 18,
        sourceType: 'ai_generated',
        confidence: 0.65,
        rationale: `${request.proposedMarkName} 관련 주변 상품`,
      },
    ];
  }

  async generateReport(request: ReportGenerationRequest): Promise<GeneratedReport> {
    await new Promise((r) => setTimeout(r, 400));
    const count = request.searchResults.length;
    return {
      summary: `"${request.markName}" 상표에 대해 ${count}건의 유사상표가 검색되었습니다. [Mock] 전반적으로 출원 가능성이 있으나 유사상표 현황을 면밀히 검토할 필요가 있습니다.`,
      riskNote: '[Mock] 위험 수준: 중간 — 유사한 상표가 존재하므로 지정상품 범위 조정을 권고합니다.',
      recommendation: '조건부 출원 — 지정상품 범위를 구체화하면 등록 가능성이 높아집니다.',
      clientReplyDraft: `안녕하세요.\n\n"${request.markName}" 상표에 대한 검토 결과를 안내드립니다.\n\n[Mock 초안] 검토 완료되었습니다. 구체적인 내용은 담당 변리사와 상담 후 확정됩니다.\n\n감사합니다.\n특허법인 인벤싱크 드림`,
    };
  }
}
