/**
 * Anthropic Claude LLM adapter.
 * Produces attorney-facing trademark review drafts in the firm's opinion format.
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

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

type ClaudeJsonShape = Record<string, unknown>;

function isRecord(value: unknown): value is ClaudeJsonShape {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractJsonObject(text: string): ClaudeJsonShape {
  const direct = text.trim();
  const candidates = [
    direct,
    ...Array.from(direct.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((match) => match[1]?.trim() ?? ''),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (isRecord(parsed)) return parsed;
    } catch {
      // Try a balanced object extraction below.
    }
  }

  const extracted = extractFirstBalancedObject(direct);
  if (extracted) {
    const parsed = JSON.parse(extracted) as unknown;
    if (isRecord(parsed)) return parsed;
  }

  throw new Error('Claude response did not contain a valid JSON object');
}

function extractFirstBalancedObject(text: string): string | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function normalizeGeneratedText(value: unknown, fallback = ''): string {
  return asString(value, fallback).replace(/\\n/g, '\n');
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function topSearchResults(request: ReportGenerationRequest) {
  return request.searchResults.slice(0, 12).map((result, index) => ({
    index: index + 1,
    markName: result.markName,
    applicantName: result.applicantName ?? '미상',
    relevanceScore:
      result.relevanceScore !== undefined ? Math.round(result.relevanceScore * 100) + '%' : '미산출',
  }));
}

export class AnthropicLLMAdapter implements ILLMPort {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.CLAUDE_MODEL ?? DEFAULT_MODEL
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      await this.completeJson('Respond with {"ok":true}.', 256);
      return true;
    } catch {
      return false;
    }
  }

  async parseInquiry(request: LLMParseRequest): Promise<ParsedInquiryData> {
    const parsed = await this.completeJson(
      `당신은 한국 상표 출원 검토를 준비하는 변리사 보조자입니다.

아래 고객 요청에서 상표 검토에 필요한 정보를 추출하세요. 반드시 JSON 객체만 출력하세요.

출력 형식:
{
  "markNameNormalized": "정규화된 상표명",
  "goodsDescriptionNormalized": "상품/서비스 설명과 검토 포인트를 반영한 정규화 문장",
  "industry": "업종",
  "confidence": 0.0,
  "missingFields": ["부족한 정보"],
  "reasoning": "추출 근거"
}

[의뢰 제목]
${request.title}

[제안 상표명]
${request.proposedMarkName ?? '미기재'}

[의뢰 내용]
${request.rawText}

[발신자]
${request.senderEmail ?? '미기재'}`,
      1200
    );

    return {
      markNameNormalized: asString(parsed.markNameNormalized, request.proposedMarkName ?? request.title),
      goodsDescriptionNormalized: asString(parsed.goodsDescriptionNormalized, request.rawText.slice(0, 500)),
      industry: asString(parsed.industry, '미분류'),
      confidence: asNumber(parsed.confidence, 0.7),
      missingFields: asStringArray(parsed.missingFields),
      reasoning: asString(parsed.reasoning, '고객 요청 내용 기준으로 추출'),
    };
  }

  async generateCandidates(request: CandidateGenerationRequest): Promise<GeneratedCandidate[]> {
    const parsed = await this.completeJson(
      `당신은 한국 상표 지정상품 설계를 수행하는 변리사입니다.

KIPRIS/NICE 분류 검색에 투입할 수 있도록 지정상품 및 지정서비스업 후보를 설계하세요. 반드시 JSON 객체만 출력하세요.

출력 형식:
{
  "candidates": [
    {
      "term": "지정상품 또는 지정서비스업",
      "normalizedTerm": "검색 및 출원에 사용할 정규화 명칭",
      "classNo": 9,
      "sourceType": "ai_generated",
      "confidence": 0.0,
      "rationale": "추천 이유와 권리화 의도"
    }
  ]
}

작성 기준:
- 고객 사업 설명을 제9류, 제35류, 제38류, 제41류, 제42류 등 관련 류 관점에서 검토하세요.
- 실제 출원 명세에 가까운 구체적 표현을 우선하세요.
- 너무 포괄적인 명칭은 피하고, 필요하면 하드웨어/소프트웨어/서비스를 나누세요.
- 지정상품 후보는 ${request.count ?? 12}개 생성하세요.
- sourceType은 반드시 "ai_generated"로 쓰세요.

[상표명]
${request.proposedMarkName}

[고객 상품/서비스 설명]
${request.goodsDescription}

${request.classNo ? `[참고 류]\n제${request.classNo}류` : ''}`,
      2400
    );

    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    return candidates.map((candidate): GeneratedCandidate => {
      const row = candidate as Record<string, unknown>;
      return {
        term: asString(row.term),
        normalizedTerm: asString(row.normalizedTerm, asString(row.term)),
        classNo: asNumber(row.classNo),
        sourceType: 'ai_generated' as const,
        confidence: asNumber(row.confidence, 0.7),
        rationale: asString(row.rationale),
      };
    }).filter((candidate) => candidate.term && candidate.classNo > 0);
  }

  async generateReport(request: ReportGenerationRequest): Promise<GeneratedReport> {
    const parsed = await this.completeJson(
      `당신은 한국 상표 검토 의견서를 작성하는 변리사입니다.

아래 자료를 근거로 고객에게 전달하기 전 변리사가 검토·수정할 수 있는 초안을 작성하세요. 반드시 JSON 객체만 출력하세요.

최종 문서 형식은 다음 Word 양식을 따르세요:
- 제목: 상표 출원 검토 의견서 / TRADEMARK APPLICATION REVIEW OPINION
- 대상: 상표명 및 고객/출원인 정보가 있으면 병기
- 1. 지정상품의 선정: 류별 표 형식에 가까운 문장과 bullet 목록
- 2. 추가 류 출원 필요성 검토: 필요/선택/생략 가능 여부와 조건
- 3. 등록가능성 검토: 식별력, 유사상표, 유사군 또는 상품 범위별 위험도
- 4. 종합 의견: 류별 출원 권고, 등록가능성, 주요 쟁점
- 말미: 추가 문의 안내와 담당 변리사 서명 자리

출력 형식:
{
  "summary": "1. 지정상품의 선정 섹션. 류별 지정상품 목록을 포함",
  "riskNote": "3. 등록가능성 검토 섹션. 위험도와 선행상표 분석 포함",
  "recommendation": "4. 종합 의견 섹션. 출원 권고와 보완 필요사항 포함",
  "clientReplyDraft": "고객 회신 메일 본문. 인사말, 검토 결과 요약, 첨부/본문 보고서 안내, 다음 액션 포함"
}

작성 기준:
- 단정적 등록 가능 보장은 금지하고, '가능성이 있습니다', '검토가 필요합니다'처럼 전문가 검토 초안의 톤을 유지하세요.
- 유사상표 검색 결과가 부족하면 부족하다고 명시하고 수동 검토 필요성을 적으세요.
- 위험도는 높음/중간/낮음 중 하나를 반드시 포함하세요.
- 고객에게 바로 보낼 수 있게 공손하고 명확한 한국어를 사용하세요.

[검토 상표명]
${request.markName}

[상품/서비스 및 검토 요청 내용]
${request.goods}

[유사상표 검색 결과]
${JSON.stringify(topSearchResults(request), null, 2)}

[이전 리포트 또는 참고사항]
${request.previousReports?.join('\n\n') ?? '없음'}`,
      4200
    );

    return {
      summary: normalizeGeneratedText(parsed.summary, '1. 지정상품의 선정\n\n지정상품 초안 생성에 실패했습니다. 수동 검토가 필요합니다.'),
      riskNote: normalizeGeneratedText(parsed.riskNote, '3. 등록가능성 검토\n\n위험도: 중간 - 유사상표 검색 결과를 수동으로 확인해 주세요.'),
      recommendation: normalizeGeneratedText(parsed.recommendation, '4. 종합 의견\n\n조건부 출원 검토가 필요합니다.'),
      clientReplyDraft: normalizeGeneratedText(parsed.clientReplyDraft, '안녕하세요.\n\n상표 검토 의견을 준비 중입니다.\n\n감사합니다.'),
    };
  }

  private async completeJson(prompt: string, maxTokens: number): Promise<ClaudeJsonShape> {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature: 0.2,
        system: 'You are a careful Korean trademark attorney assistant. Return valid JSON only.',
        tools: [
          {
            name: 'emit_json',
            description: 'Return the requested result as a JSON object matching the user prompt.',
            input_schema: {
              type: 'object',
              additionalProperties: true,
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'emit_json' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }

    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string; name?: string; input?: unknown }>;
    };

    const toolInput = payload.content?.find(
      (item) => item.type === 'tool_use' && item.name === 'emit_json' && isRecord(item.input)
    )?.input;
    if (isRecord(toolInput)) return toolInput;

    const text = payload.content
      ?.filter((item) => item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n');
    if (!text) throw new Error('Anthropic API response did not include text content');
    return extractJsonObject(text);
  }
}
