/**
 * Anthropic Claude LLM adapter.
 * Produces attorney-facing trademark review drafts in the firm's opinion format.
 */

import type {
  ILLMPort,
  LLMAttachmentContext,
  LLMParseRequest,
  ParsedInquiryData,
  ParsedNormalizedGood,
  CandidateGenerationRequest,
  GeneratedCandidate,
  ReportGenerationRequest,
  GeneratedReport,
} from '@ip-review/domain';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504, 529]);
const MAX_ANTHROPIC_ATTEMPTS = 4;
const DEFAULT_RETRY_DELAYS_MS = [1200, 2500, 5000];

type ClaudeJsonShape = Record<string, unknown>;

type AnthropicTextBlock = { type: 'text'; text: string };
type AnthropicDocumentBlock = {
  type: 'document';
  source: { type: 'base64'; media_type: 'application/pdf'; data: string };
};
type AnthropicImageBlock = {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
};
type AnthropicUserContentBlock = AnthropicTextBlock | AnthropicDocumentBlock | AnthropicImageBlock;

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayFromHeader(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 10000);
    }
  }

  return DEFAULT_RETRY_DELAYS_MS[attempt - 1] ?? DEFAULT_RETRY_DELAYS_MS.at(-1) ?? 5000;
}

function formatAnthropicApiError(status: number, errorText: string): string {
  if (status === 529) {
    return `Claude API가 일시적으로 과부하입니다. ${MAX_ANTHROPIC_ATTEMPTS}회 재시도 후에도 처리되지 않았습니다. 잠시 후 다시 시도해 주세요.`;
  }

  return `Anthropic API error ${status}: ${errorText}`;
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

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'number' ? item : Number(item)))
        .filter((item) => Number.isInteger(item) && item > 0 && item <= 45)
    )
  );
}

function asNormalizedGoods(value: unknown): ParsedNormalizedGood[] {
  if (!Array.isArray(value)) return [];

  const goods: ParsedNormalizedGood[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;

    const classNo = asNumber(item.classNo);
    const term = asString(item.term).trim();
    if (!Number.isInteger(classNo) || classNo < 1 || classNo > 45 || !term) {
      continue;
    }

    const kind = item.kind === 'service' ? 'service' : item.kind === 'goods' ? 'goods' : undefined;
    goods.push({
      classNo,
      term,
      ...(kind && { kind }),
      basis: asString(item.basis),
      evidenceLabel: asString(item.evidenceLabel),
      evidenceUrl: asString(item.evidenceUrl),
    });
  }

  return goods;
}

function asCandidateSourceType(value: unknown): GeneratedCandidate['sourceType'] {
  return value === 'official_notice_name' ||
    value === 'accepted_similar_name' ||
    value === 'ai_generated' ||
    value === 'manual' ||
    value === 'competitor_reference'
    ? value
    : 'ai_generated';
}

function isSupportedImageMimeType(mimeType: string): mimeType is AnthropicImageBlock['source']['media_type'] {
  return mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/gif' || mimeType === 'image/webp';
}

function formatAttachmentText(attachments: LLMAttachmentContext[] | undefined): string {
  if (!attachments?.length) return '[첨부파일]\n없음';

  const lines = attachments.map((attachment, index) => {
    const base = `${index + 1}. ${attachment.fileName} (${attachment.mimeType}, ${Math.round(attachment.sizeBytes / 1024)}KB, ${attachment.extractionStatus})`;
    if (attachment.textContent) {
      return `${base}\n--- 추출 텍스트 ---\n${attachment.textContent}`;
    }
    if (attachment.kind === 'pdf' || attachment.kind === 'image') {
      return `${base}\n원본 파일은 Claude의 ${attachment.kind === 'pdf' ? 'document' : 'image'} 입력 블록으로 함께 제공됩니다.`;
    }
    return `${base}${attachment.error ? `\n분석 제외 사유: ${attachment.error}` : ''}`;
  });

  return `[첨부파일]\n${lines.join('\n\n')}`;
}

function buildUserContent(prompt: string, attachments: LLMAttachmentContext[] | undefined): AnthropicUserContentBlock[] {
  const content: AnthropicUserContentBlock[] = [];

  for (const attachment of attachments ?? []) {
    if (attachment.extractionStatus !== 'ready' || !attachment.base64Data) continue;

    if (attachment.kind === 'pdf' && attachment.mimeType === 'application/pdf') {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: attachment.base64Data,
        },
      });
    }

    if (attachment.kind === 'image' && isSupportedImageMimeType(attachment.mimeType)) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: attachment.mimeType,
          data: attachment.base64Data,
        },
      });
    }
  }

  content.push({
    type: 'text',
    text: `${prompt}\n\n${formatAttachmentText(attachments)}`,
  });

  return content;
}

function topSearchResults(request: ReportGenerationRequest) {
  return request.searchResults.slice(0, 12).map((result, index) => ({
    index: index + 1,
    markName: result.markName,
    applicantName: result.applicantName ?? '미상',
    applicationNumber: result.applicationNumber ?? '',
    registerNumber: result.registerNumber ?? '',
    classNo: result.classNo ?? '',
    statusLabel: result.statusLabel ?? '',
    designatedGoodsSummary: result.designatedGoodsSummary ?? '',
    similarityGroupCodes: result.similarityGroupCodes ?? [],
    relevanceScore:
      result.relevanceScore !== undefined ? Math.round(result.relevanceScore * 100) + '%' : '미산출',
  }));
}

function topCandidateGoods(request: ReportGenerationRequest) {
  return (request.candidateGoods ?? []).slice(0, 12).map((candidate, index) => ({
    index: index + 1,
    term: candidate.term,
    normalizedTerm: candidate.normalizedTerm ?? candidate.term,
    classNo: candidate.classNo,
    sourceType: candidate.sourceType,
    similarityGroupCodes: candidate.similarityGroupCodes ?? [],
    rationale: candidate.rationale ?? '',
  }));
}

function candidateReferenceGoods(request: CandidateGenerationRequest) {
  return (request.referenceGoods ?? []).slice(0, 30).map((candidate, index) => ({
    index: index + 1,
    term: candidate.term,
    normalizedTerm: candidate.normalizedTerm,
    classNo: candidate.classNo,
    sourceType: candidate.sourceType,
    confidence: candidate.confidence,
    similarityGroupCodes: candidate.similarityGroupCodes ?? [],
    rationale: candidate.rationale,
    query: candidate.query ?? '',
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

아래 고객 요청과 첨부파일에서 상표 검토에 필요한 정보를 추출하세요. 첨부파일의 검토 요청서, 상품 설명서, 이미지에 상표명이나 상품·서비스 설명이 있으면 의뢰 내용과 함께 반영하세요. 반드시 JSON 객체만 출력하세요.
KIPRIS 1차 참고 근거가 제공되면 이를 먼저 검토하되, 고객 요청과 충돌하는 경우에는 충돌 여부를 reasoning에 명시하세요.

출력 형식:
{
  "markNameNormalized": "정규화된 상표명",
  "goodsDescriptionNormalized": "상품/서비스 설명과 검토 포인트를 반영한 정규화 문장",
  "normalizedGoods": [
    {
      "classNo": 9,
      "term": "지정상품/지정서비스업 명칭",
      "kind": "goods",
      "basis": "고객 의뢰 또는 첨부자료에서 확인한 선정 근거",
      "evidenceLabel": "KIPRIS 1차 참고 근거 또는 첨부자료명",
      "evidenceUrl": ""
    }
  ],
  "industry": "업종",
  "targetClasses": [9, 38, 42],
  "confidence": 0.0,
  "missingFields": ["부족한 정보"],
  "reasoning": "추출 근거"
}

추출 기준:
- 의뢰 내용에 "9류, 38류, 42류"처럼 지정 류가 있으면 targetClasses에 숫자 배열로 반드시 보존하세요.
- normalizedGoods는 고객 의뢰와 첨부자료를 분석해 실제 출원 검토가 필요한 류별 지정상품/지정서비스업을 개별 항목으로 나누어 작성하세요.
- normalizedGoods.term은 "소프트웨어"처럼 지나치게 넓게 쓰지 말고, 첨부자료 맥락을 반영해 KIPRIS/NICE 검색에 투입할 수 있는 수준으로 구체화하세요.
- normalizedGoods.classNo는 고객 요청 류와 첨부자료 맥락을 함께 판단해 기재하세요. 출원 필요성이 낮은 류도 고객이 요청했다면 별도 항목으로 두고 basis에 "필요성 검토 대상"이라고 쓰세요.
- evidenceUrl은 확실한 원문 URL이 제공된 경우에만 사용하고, 없으면 빈 문자열로 두세요. URL을 추측해서 만들지 마세요.
- 고객이 특정 류 검토를 요청했더라도, 첨부파일 맥락상 출원 필요성이 낮아 보이는 류는 goodsDescriptionNormalized와 reasoning에 "필요성 검토 대상"으로 표시하세요.
- PDF/이미지 첨부에서 제품명, SDK, ROS, NPU, 반도체, 소프트웨어 플랫폼, 로봇 운영체제, 원격제어, SaaS 등 키워드를 확인하면 상품/서비스 설명에 반영하세요.

[의뢰 제목]
${request.title}

[KIPRIS 1차 참고 근거]
${request.referenceEvidence ?? '없음'}

[제안 상표명]
${request.proposedMarkName ?? '미기재'}

[의뢰 내용]
${request.rawText}

[발신자]
${request.senderEmail ?? '미기재'}`,
      2000,
      request.attachments
    );

    return {
      markNameNormalized: asString(parsed.markNameNormalized, request.proposedMarkName ?? request.title),
      goodsDescriptionNormalized: asString(parsed.goodsDescriptionNormalized, request.rawText.slice(0, 500)),
      normalizedGoods: asNormalizedGoods(parsed.normalizedGoods),
      industry: asString(parsed.industry, '미분류'),
      targetClasses: asNumberArray(parsed.targetClasses),
      confidence: asNumber(parsed.confidence, 0.7),
      missingFields: asStringArray(parsed.missingFields),
      reasoning: asString(parsed.reasoning, '고객 요청 내용 기준으로 추출'),
    };
  }

  async generateCandidates(request: CandidateGenerationRequest): Promise<GeneratedCandidate[]> {
    const parsed = await this.completeJson(
      `당신은 한국 상표 지정상품 설계를 수행하는 변리사입니다.

KIPRIS/NICE 분류 검색에 투입할 수 있도록 지정상품 및 지정서비스업 후보를 설계하세요. 반드시 JSON 객체만 출력하세요.
KIPRIS 유사상품군 근거를 최우선으로 검토하고, 내부 DB 근거는 보조 참고자료로만 사용하세요. 최종 후보 선정 판단은 반드시 Claude가 수행합니다. KIPRIS/내부 DB 근거가 부족할 때만 AI 보완 후보를 추가하세요.

출력 형식:
{
  "candidates": [
    {
      "term": "지정상품 또는 지정서비스업",
      "normalizedTerm": "검색 및 출원에 사용할 정규화 명칭",
      "classNo": 9,
      "sourceType": "ai_generated",
      "confidence": 0.0,
      "rationale": "추천 이유와 권리화 의도",
      "similarityGroupCodes": ["G390802"]
    }
  ]
}

작성 기준:
- 고객이 지정한 targetClasses가 있으면 그 류를 우선 검토하되, 출원 필요성이 낮은 류는 "선택적/생략 가능" 판단 근거를 남기세요.
- targetClasses가 없으면 고객 사업 설명을 제9류, 제35류, 제38류, 제41류, 제42류 등 관련 류 관점에서 검토하세요.
- 실제 출원 명세에 가까운 구체적 표현을 우선하세요.
- 너무 포괄적인 명칭은 피하고, 필요하면 하드웨어/소프트웨어/서비스를 나누세요.
- 지정상품 후보는 ${request.count ?? 12}개 생성하세요.
- DXNewton처럼 AI 반도체/NPU/SDK/ROS/로봇 운영 플랫폼 맥락이 확인되면 제9류 소프트웨어·반도체·집적회로와 제42류 설계·개발·AIaaS·기술자문을 중심으로 설계하고, 제38류는 통신서비스 자체 제공 근거가 있을 때만 후보화하세요.
- KIPRIS 유사상품군 근거를 채택하면 sourceType은 "accepted_similar_name"으로 쓰고 similarityGroupCodes를 유지하세요.
- 내부 공식 고시명칭 근거를 채택하면 sourceType은 "official_notice_name"으로 쓰세요.
- 내부 유사 인정명칭 근거를 채택하면 sourceType은 "accepted_similar_name"으로 쓰세요.
- 근거 목록에 없는 보완 후보를 추가할 때만 sourceType은 "ai_generated"로 쓰세요.
- ${request.evidencePolicy ?? 'KIPRIS 우선, 내부 DB 보조, AI 보완은 필요한 경우에만 사용'}

[상표명]
${request.proposedMarkName}

[고객 상품/서비스 설명]
${request.goodsDescription}

${request.classNo ? `[참고 류]\n제${request.classNo}류` : ''}
${request.targetClasses?.length ? `[고객 요청/Claude 추출 대상 류]\n${request.targetClasses.map((classNo) => `제${classNo}류`).join(', ')}` : ''}

[KIPRIS 및 내부 DB 참고 근거]
${JSON.stringify(candidateReferenceGoods(request), null, 2)}`,
      2400
    );

    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    return candidates.map((candidate): GeneratedCandidate => {
      const row = candidate as Record<string, unknown>;
      return {
        term: asString(row.term),
        normalizedTerm: asString(row.normalizedTerm, asString(row.term)),
        classNo: asNumber(row.classNo),
        sourceType: asCandidateSourceType(row.sourceType),
        confidence: asNumber(row.confidence, 0.7),
        rationale: asString(row.rationale),
        similarityGroupCodes: asStringArray(row.similarityGroupCodes),
      };
    }).filter((candidate) => candidate.term && candidate.classNo > 0);
  }

  async generateReport(request: ReportGenerationRequest): Promise<GeneratedReport> {
    const parsed = await this.completeJson(
      `당신은 한국 상표 검토 의견서를 작성하는 변리사입니다.

아래 자료와 고객 첨부파일을 근거로 고객에게 전달하기 전 변리사가 검토·수정할 수 있는 초안을 작성하세요. 첨부파일에 포함된 검토 요청서, 상품 소개서, 로고/상표 이미지의 맥락도 반영하세요. 반드시 JSON 객체만 출력하세요.

최종 문서 형식은 다음 Word 양식을 따르세요:
- 제목: 상표 출원 검토 의견서 / TRADEMARK APPLICATION REVIEW OPINION
- 대상: 상표명 및 고객/출원인 정보가 있으면 병기
- 1. 지정상품의 선정: 류별 표 형식에 가까운 문장과 bullet 목록
- 2. 추가 류 출원 필요성 검토: 고객이 제38류 등 특정 류를 요청했으나 사업상 필요성이 낮아 보이면 "제38류 출원 필요성 검토"처럼 별도 제목으로 필요/선택/생략 가능 여부와 조건을 설명
- 3. 등록가능성 검토: 식별력, 유사상표, 유사군 또는 상품 범위별 위험도
- 4. 행정처리 이력 및 분류코드 변동 확인 필요성: 현재 제공 데이터로 확인 가능한 상태와 추가 확인이 필요한 지점
- 5. 종합 의견: 류별 출원 권고, 등록가능성, 주요 쟁점
- 말미: 추가 문의 안내와 담당 변리사 서명 자리

DXNewton 실제 의견서 스타일 참고:
- 제9류는 소프트웨어, SDK, ROS/로봇 운영, NPU/반도체/집적회로 등 핵심 제품군을 bullet로 정리합니다.
- 제42류는 AIaaS, 집적회로/반도체 설계, 로봇공학 서비스, 소프트웨어·펌웨어 개발, NPU 기반 연구/자문 등 서비스업을 bullet로 정리합니다.
- 제38류는 통신 인프라 자체를 외부에 제공하는 사업모델이 확인될 때만 권장하고, 근거가 부족하면 선택적 또는 생략 가능으로 정리합니다.
- 유사군별 등록가능성은 "G390802 (소프트웨어)", "G390804 (반도체)"처럼 유사군 코드가 있으면 코드 단위로 위험도와 핵심 쟁점을 설명합니다.

출력 형식:
{
  "summary": "1. 지정상품의 선정 섹션. 류별 지정상품 목록을 포함",
  "riskNote": "3. 등록가능성 검토 섹션. 위험도와 선행상표 분석 포함",
  "recommendation": "4. 행정처리 이력 및 분류코드 변동 확인 필요성 + 5. 종합 의견 섹션. 출원 권고와 보완 필요사항 포함",
  "clientReplyDraft": "고객 회신 메일 본문. 인사말, 검토 결과 요약, 첨부/본문 보고서 안내, 다음 액션 포함"
}

작성 기준:
- 단정적 등록 가능 보장은 금지하고, '가능성이 있습니다', '검토가 필요합니다'처럼 전문가 검토 초안의 톤을 유지하세요.
- 유사상표 검색 결과가 부족하면 부족하다고 명시하고 수동 검토 필요성을 적으세요.
- 위험도는 높음/중간/낮음 중 하나를 반드시 포함하세요.
- 가능하면 등록가능성을 백분율로 단정하지 말고, 샘플처럼 필요할 때만 "약 60%" 등 변리사 검토용 추정치로 표현하세요.
- 지정상품 선정에는 후보의 sourceType, rationale, similarityGroupCodes를 근거로 KIPRIS 유사상품군/공식 명칭/AI 보완 여부를 구분해 쓰세요.
- 유사상표 검색 결과에는 applicationNumber, registerNumber, classNo, statusLabel, designatedGoodsSummary, similarityGroupCodes가 있으면 등록가능성 판단 근거로 반영하세요.
- 상표 출원 속보 데이터는 선행상표 검색의 1차 근거로 쓰고, 상표 행정처리 이력과 상표 분류코드 변동 이력은 현재 자동 조회되지 않은 경우 "추가 확인 필요"로 명시하세요.
- 분류코드나 유사군 코드가 있는 경우, 그 코드가 변동될 수 있음을 전제로 최종 제출 전 최신 분류코드 변동 이력 확인을 권고하세요.
- 고객에게 바로 보낼 수 있게 공손하고 명확한 한국어를 사용하세요.

[검토 상표명]
${request.markName}

[상품/서비스 및 검토 요청 내용]
${request.goods}

[지정상품 후보 및 유사군 근거]
${JSON.stringify(topCandidateGoods(request), null, 2)}

[유사상표 검색 결과]
${JSON.stringify(topSearchResults(request), null, 2)}

[이전 리포트 또는 참고사항]
${request.previousReports?.join('\n\n') ?? '없음'}`,
      6000,
      request.attachments
    );

    return {
      summary: normalizeGeneratedText(parsed.summary, '1. 지정상품의 선정\n\n지정상품 초안 생성에 실패했습니다. 수동 검토가 필요합니다.'),
      riskNote: normalizeGeneratedText(parsed.riskNote, '3. 등록가능성 검토\n\n위험도: 중간 - 유사상표 검색 결과를 수동으로 확인해 주세요.'),
      recommendation: normalizeGeneratedText(parsed.recommendation, '4. 종합 의견\n\n조건부 출원 검토가 필요합니다.'),
      clientReplyDraft: normalizeGeneratedText(parsed.clientReplyDraft, '안녕하세요.\n\n상표 검토 의견을 준비 중입니다.\n\n감사합니다.'),
    };
  }

  private async completeJson(
    prompt: string,
    maxTokens: number,
    attachments?: LLMAttachmentContext[]
  ): Promise<ClaudeJsonShape> {
    const response = await this.fetchWithRetry(prompt, maxTokens, attachments);

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

  private async fetchWithRetry(
    prompt: string,
    maxTokens: number,
    attachments?: LLMAttachmentContext[]
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_ANTHROPIC_ATTEMPTS; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(ANTHROPIC_MESSAGES_URL, {
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
                  properties: {},
                  additionalProperties: true,
                },
              },
            ],
            tool_choice: { type: 'tool', name: 'emit_json' },
            messages: [{ role: 'user', content: buildUserContent(prompt, attachments) }],
          }),
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt >= MAX_ANTHROPIC_ATTEMPTS) break;

        console.warn('[anthropic-adapter] retrying Claude request after fetch failure', {
          attempt,
          maxAttempts: MAX_ANTHROPIC_ATTEMPTS,
          error: lastError.message,
        });
        await delay(DEFAULT_RETRY_DELAYS_MS[attempt - 1] ?? 5000);
        continue;
      }

      if (response.ok) return response;

      const errorText = await response.text();
      const shouldRetry =
        RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_ANTHROPIC_ATTEMPTS;

      if (!shouldRetry) {
        throw new Error(formatAnthropicApiError(response.status, errorText));
      }

      console.warn(
        `[anthropic-adapter] retrying Claude request after ${response.status} response`,
        { attempt, maxAttempts: MAX_ANTHROPIC_ATTEMPTS }
      );
      await delay(retryDelayFromHeader(response, attempt));
    }

    throw lastError ?? new Error('Anthropic API request failed');
  }
}
