/**
 * Google Gemini LLM 어댑터
 * ILLMPort 구현 — 정규화·후보생성·검토리포트 3가지 기능 제공
 */

import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerationConfig,
} from '@google/generative-ai';
import type {
  ILLMPort,
  LLMParseRequest,
  ParsedInquiryData,
  CandidateGenerationRequest,
  GeneratedCandidate,
  ReportGenerationRequest,
  GeneratedReport,
} from '@ip-review/domain';

const MODEL_FLASH = 'gemini-2.5-flash';

export class GeminiLLMAdapter implements ILLMPort {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: MODEL_FLASH });
      await model.generateContent('ping');
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // 1단계: 의뢰 정규화 (parseInquiry)
  // ─────────────────────────────────────────────
  async parseInquiry(request: LLMParseRequest): Promise<ParsedInquiryData> {
    const config: GenerationConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          markNameNormalized: { type: SchemaType.STRING },
          goodsDescriptionNormalized: { type: SchemaType.STRING },
          industry: { type: SchemaType.STRING },
          confidence: { type: SchemaType.NUMBER },
          missingFields: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          reasoning: { type: SchemaType.STRING },
        },
        required: ['markNameNormalized', 'goodsDescriptionNormalized', 'industry', 'confidence'],
      },
    };

    const model = this.client.getGenerativeModel({ model: MODEL_FLASH, generationConfig: config });

    const prompt = `당신은 한국 상표 출원 전문가입니다. 아래 의뢰 내용을 분석하여 상표 출원에 필요한 정보를 추출하세요.

[의뢰 제목]
${request.title}

[제안 상표명]
${request.proposedMarkName ?? '미기재'}

[의뢰 내용]
${request.rawText}

[발신자]
${request.senderEmail ?? '미기재'}

다음 규칙을 따르세요:
- markNameNormalized: 제안 상표명을 정규화 (한글/영문 병기, 특수문자 제거)
- goodsDescriptionNormalized: 지정상품/서비스를 한국 상품류 분류에 맞게 구체적으로 서술
- industry: 업종 분류 (예: 전자기기, 의류, 식품, 소프트웨어, 서비스업 등)
- confidence: 추출 신뢰도 0~1 (정보가 명확할수록 높음)
- missingFields: 출원에 필요하지만 부족한 정보 목록
- reasoning: 분석 근거 한 줄 요약`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      return JSON.parse(text) as ParsedInquiryData;
    } catch {
      return {
        markNameNormalized: request.proposedMarkName ?? request.title,
        goodsDescriptionNormalized: request.rawText.substring(0, 300),
        industry: 'general',
        confidence: 0.5,
        missingFields: ['파싱 실패 — 수동 확인 필요'],
        reasoning: '응답 파싱 오류',
      };
    }
  }

  // ─────────────────────────────────────────────
  // 3단계: 지정상품 후보 생성 (generateCandidates)
  // ─────────────────────────────────────────────
  async generateCandidates(request: CandidateGenerationRequest): Promise<GeneratedCandidate[]> {
    const config: GenerationConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          candidates: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                term: { type: SchemaType.STRING },
                normalizedTerm: { type: SchemaType.STRING },
                classNo: { type: SchemaType.NUMBER },
                sourceType: { type: SchemaType.STRING },
                confidence: { type: SchemaType.NUMBER },
                rationale: { type: SchemaType.STRING },
              },
              required: ['term', 'normalizedTerm', 'classNo', 'sourceType', 'confidence', 'rationale'],
            },
          },
        },
        required: ['candidates'],
      },
    };

    const model = this.client.getGenerativeModel({ model: MODEL_FLASH, generationConfig: config });

    const prompt = `당신은 한국 상표 출원 전문 변리사입니다. 아래 상표에 대해 출원할 지정상품/서비스 후보를 생성하세요.

[상표명]
${request.proposedMarkName}

[상품/서비스 설명]
${request.goodsDescription}

${request.classNo ? `[참고 류] ${request.classNo}류` : ''}

다음 조건을 반드시 지키세요:
1. 한국 특허청 상품류 구분(Nice 분류 45류 체계)에 정확히 맞는 지정상품명 사용
2. 각 항목은 별개의 류(classNo)에 속할 수 있음
3. 고시 명칭(official notice name) 위주로 선정하되 AI 추천(ai_generated)도 포함
4. confidence: 해당 상품이 본 상표 출원에 적합한 정도 (0~1)
5. rationale: 해당 상품을 추천하는 이유 (한 줄, 한국어)
6. sourceType은 반드시 "ai_generated" 사용
7. ${request.count ?? 8}개 후보 생성

지정상품명은 한국어 공식 명칭을 사용하고 너무 광범위하거나 너무 좁지 않게 선정하세요.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const parsed = JSON.parse(text) as { candidates: GeneratedCandidate[] };
      return parsed.candidates ?? [];
    } catch {
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // 5단계: 검토 리포트 생성 (generateReport)
  // ─────────────────────────────────────────────
  async generateReport(request: ReportGenerationRequest): Promise<GeneratedReport> {
    const config: GenerationConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          summary: { type: SchemaType.STRING },
          riskNote: { type: SchemaType.STRING },
          recommendation: { type: SchemaType.STRING },
          clientReplyDraft: { type: SchemaType.STRING },
        },
        required: ['summary', 'riskNote', 'recommendation', 'clientReplyDraft'],
      },
    };

    const model = this.client.getGenerativeModel({ model: MODEL_FLASH, generationConfig: config });

    const similarList = request.searchResults
      .slice(0, 10)
      .map((r, i) =>
        `${i + 1}. 상표명: "${r.markName}" / 출원인: ${r.applicantName ?? '미상'} / 유사도: ${
          r.relevanceScore !== undefined ? Math.round(r.relevanceScore * 100) + '%' : '미산출'
        }`
      )
      .join('\n');

    const prompt = `당신은 한국 상표 검토 전문 변리사입니다. 아래 상표 검색 결과를 바탕으로 검토 리포트를 작성하세요.

[검토 상표명]
${request.markName}

[지정상품/서비스]
${request.goods}

[유사상표 검색 결과 (상위 ${request.searchResults.slice(0, 10).length}건)]
${similarList || '검색 결과 없음'}

각 항목을 작성하세요:

1. summary (검토 요약)
   - 유사상표 현황과 전반적인 출원 가능성을 3~5문장으로 요약
   - 한국어, 전문적 어조

2. riskNote (위험 분석)
   - 가장 충돌 가능성이 높은 상표 2~3개 지목하고 이유 설명
   - 위험 수준: 높음/중간/낮음으로 시작
   - 한국어

3. recommendation (출원 가능성 평가)
   - "출원 권장", "조건부 출원", "출원 재검토 필요" 중 하나로 시작
   - 구체적 이유와 조건(있는 경우) 설명
   - 한국어, 2~3문장

4. clientReplyDraft (고객 회신 초안)
   - 고객에게 보낼 정중한 한국어 이메일 본문 (인사말~결론 포함)
   - 전문적이고 이해하기 쉬운 표현 사용
   - 검토 결과와 권고사항 포함`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      return JSON.parse(text) as GeneratedReport;
    } catch {
      return {
        summary: '리포트 생성 중 오류가 발생했습니다. 수동으로 작성해 주세요.',
        riskNote: '위험 분석 실패',
        recommendation: '출원 재검토 필요',
        clientReplyDraft: '검토 결과를 준비 중입니다.',
      };
    }
  }
}
