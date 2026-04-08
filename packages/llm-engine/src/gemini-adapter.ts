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
  LLMAttachmentContext,
  LLMParseRequest,
  ParsedInquiryData,
  CandidateGenerationRequest,
  GeneratedCandidate,
  ReportGenerationRequest,
  GeneratedReport,
} from '@ip-review/domain';

const MODEL_FLASH = 'gemini-2.5-flash';

function formatAttachmentPrompt(attachments: LLMAttachmentContext[] | undefined): string {
  if (!attachments?.length) return '[첨부파일]\n없음';

  return `[첨부파일]\n${attachments.map((attachment, index) => {
    const header = `${index + 1}. ${attachment.fileName} (${attachment.mimeType}, ${Math.round(attachment.sizeBytes / 1024)}KB, ${attachment.extractionStatus})`;
    if (attachment.textContent) {
      return `${header}\n--- 추출 텍스트 ---\n${attachment.textContent}`;
    }
    if (attachment.kind === 'pdf' || attachment.kind === 'image') {
      return `${header}\nClaude 원본 분석 대상 파일입니다. Gemini fallback에서는 파일명과 형식만 참고하세요.`;
    }
    return `${header}${attachment.error ? `\n분석 제외 사유: ${attachment.error}` : ''}`;
  }).join('\n\n')}`;
}

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

[첨부파일 분석 컨텍스트]
${formatAttachmentPrompt(request.attachments)}

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
3. 고시 명칭 위주로 선정하되 AI 추천 용어도 포함
4. confidence: 해당 상품이 본 상표 출원에 적합한 정도 (0~1)
5. rationale: 해당 상품을 추천하는 이유 (한 줄, 한국어)
6. sourceType 분류 기준 (정확히 따를 것):
   - "official_notice_name": 특허청 고시 상품명칭 목록에 실제 등재된 공식 명칭
   - "ai_generated": 위 목록에 없거나 불확실한 AI 추천 용어
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
      .map((r, i) => {
        const score = r.relevanceScore !== undefined ? `유사도 ${Math.round(r.relevanceScore * 100)}%` : '유사도 미산출';
        const status = r.statusLabel ? ` / 상태: ${r.statusLabel}` : '';
        const appNo = r.applicationNumber ? ` / 출원번호: ${r.applicationNumber}` : '';
        const classInfo = r.classNo ? ` / 제${r.classNo}류` : '';
        return `${i + 1}. 상표명: "${r.markName}" / 출원인: ${r.applicantName ?? '미상'} / ${score}${status}${classInfo}${appNo}`;
      })
      .join('\n');
    const candidateList = (request.candidateGoods ?? [])
      .slice(0, 12)
      .map((candidate, i) => {
        const codes = candidate.similarityGroupCodes?.length
          ? ` / 유사군: ${candidate.similarityGroupCodes.join(', ')}`
          : '';
        return `${i + 1}. ${candidate.normalizedTerm ?? candidate.term} / 제${candidate.classNo}류 / 출처: ${candidate.sourceType}${codes} / 근거: ${candidate.rationale ?? '미기재'}`;
      })
      .join('\n');

    const clientGreeting = request.clientName
      ? `${request.clientName}${request.companyName ? ` (${request.companyName})` : ''}` + ' 고객님'
      : '고객님';

    const handlerSign = request.handlerName
      ? `담당 변리사 ${request.handlerName} 드림`
      : '담당 변리사 드림';

    const prompt = `당신은 한국 상표 검토 전문 변리사입니다. 아래 정보를 바탕으로 검토 리포트의 4개 항목을 작성하세요.

[의뢰 정보]
- 상표명(원문): ${request.markName}
- 상표명(정규화): ${request.parsedMarkName ?? request.markName}
- 지정상품/서비스: ${request.parsedGoods ?? request.goods}
- 업종 분류: ${request.industry ?? '미분류'}

[고객 정보]
- 고객명: ${request.clientName ?? '미기재'}
- 회사명: ${request.companyName ?? '미기재'}
- 이메일: ${request.clientEmail ?? '미기재'}

[KIPRIS 유사상표 검색 결과 (상위 ${request.searchResults.slice(0, 10).length}건)]
${similarList || '검색 결과 없음 — 충돌 상표 없음'}

[지정상품 후보 및 유사군 근거]
${candidateList || '지정상품 후보 근거 없음'}

[첨부파일 분석 컨텍스트]
${formatAttachmentPrompt(request.attachments)}

---

각 항목을 아래 조건에 따라 작성하세요:

1. summary (검토 요약)
   - "1. 지정상품의 선정" 제목을 포함하고, 류별 지정상품 후보와 KIPRIS 유사상품군/유사군 코드 근거를 정리
   - 검색된 유사상표 총 건수와 주요 현황을 첫 문장에 명시
   - 위험 수준(높음/중간/낮음) 및 근거를 2~3문장으로 서술
   - KIPRIS 검색 데이터를 근거로 사용, 출원인·유사도·상태 언급
   - 전문적이고 객관적인 한국어 어조

2. riskNote (위험 분석)
   - 반드시 "위험 수준: 높음/중간/낮음" 중 하나로 시작
   - 유사도 상위 2~3개 상표를 지목하여 충돌 가능성 이유 설명
   - 각 상표의 출원인, 유사도%, 상태를 구체적으로 인용
   - 검색 결과가 없으면 "위험 수준: 낮음 — 충돌 상표 미검출"로 기재

3. recommendation (출원 가능성 평가)
   - 반드시 "출원 권장", "조건부 출원", "출원 재검토 필요" 중 하나로 시작
   - 구체적 근거(유사상표 현황, 식별력, 지정상품 범위)를 2~3문장으로 설명
   - 조건이 있는 경우 명시
   - 행정처리 이력과 분류코드 변동 이력은 현재 자동 조회되지 않은 경우 "추가 확인 필요"로 명시
   - 유사군 코드가 있는 경우 최종 제출 전 최신 분류코드 변동 이력 확인을 권고

4. clientReplyDraft (고객 회신 초안)
   다음 구조를 반드시 지키되, 각 단락 사이에 빈 줄(\\n\\n)을 넣어 단락을 명확히 구분하세요.

   형식:
   안녕하세요, ${clientGreeting}.

   [상표명] 상표 검토 결과를 아래와 같이 안내드립니다.

   ■ 검토 개요
   - 검토 상표명: [정규화된 상표명]
   - 지정상품/서비스: [지정상품 요약]
   - 검토 기준: KIPRIS 특허청 상표 데이터베이스

   ■ 유사상표 검색 결과
   KIPRIS 검색 결과, 총 [N]건의 관련 상표가 검색되었습니다. [주요 상표 2~3개를 "상표명(출원인, 유사도%)" 형식으로 언급하거나, 결과 없음 명시]

   ■ 위험 분석 및 출원 가능성
   [riskNote 핵심 내용을 고객 친화적 언어로 요약. KIPRIS 데이터 근거 포함]

   ■ 권고사항
   [recommendation 내용을 권고 행동으로 안내. 다음 단계 포함]

   추가 문의 사항이 있으시면 언제든지 연락 주시기 바랍니다.

   ${handlerSign}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const parsed = JSON.parse(text) as GeneratedReport;
      // Gemini가 JSON 내 개행을 리터럴 \n 으로 출력하는 경우 정규화
      const norm = (s: string) => (s || '').replace(/\\n/g, '\n');
      return {
        summary: norm(parsed.summary),
        riskNote: norm(parsed.riskNote),
        recommendation: norm(parsed.recommendation),
        clientReplyDraft: norm(parsed.clientReplyDraft),
      };
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
