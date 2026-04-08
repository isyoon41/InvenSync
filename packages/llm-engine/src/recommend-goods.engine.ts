/**
 * RecommendGoodsEngine — 상품 후보 추천 엔진
 *
 * 전략:
 * 1. IGoodsTermPort를 통해 DB에서 공식 고시 명칭 / 유사 인정 명칭 조회
 * 2. Jaro-Winkler 유사도로 질의어와 각 용어를 스코어링
 * 3. 임계값 이상인 DB 결과를 우선 반환 (출처 명시)
 * 4. 요청 count에 부족하면 ILLMPort로 AI 후보 추가 생성
 * 5. 중복 제거 후 최종 후보 배열 반환
 */

import type {
  IGoodsTermPort,
  ILLMPort,
  GeneratedCandidate,
  CandidateGenerationRequest,
} from "@ip-review/domain";

export interface SimilarGoodsLookupPort {
  searchSimilarGoods(
    query: string,
    classNo?: number
  ): Promise<Array<{ goodsName: string; similarCode: string; classNo: string }>>;
}

// ─── Jaro-Winkler 유사도 ───────────────────────────────────────────────────

function jaroSimilarity(s: string, t: string): number {
  if (s === t) return 1;
  const sLen = s.length;
  const tLen = t.length;
  if (sLen === 0 || tLen === 0) return 0;

  const matchWindow = Math.max(Math.floor(Math.max(sLen, tLen) / 2) - 1, 0);
  const sMatches = new Array<boolean>(sLen).fill(false);
  const tMatches = new Array<boolean>(tLen).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < sLen; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, tLen);
    for (let j = start; j < end; j++) {
      if (tMatches[j] || s[i] !== t[j]) continue;
      sMatches[i] = true;
      tMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < sLen; i++) {
    if (!sMatches[i]) continue;
    while (!tMatches[k]) k++;
    if (s[i] !== t[k]) transpositions++;
    k++;
  }

  return (
    (matches / sLen +
      matches / tLen +
      (matches - transpositions / 2) / matches) /
    3
  );
}

function jaroWinkler(s: string, t: string, p = 0.1): number {
  const jaro = jaroSimilarity(s, t);
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(s.length, t.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (s[i] === t[i]) prefix++;
    else break;
  }
  return jaro + prefix * p * (1 - jaro);
}

/** 한글/영문 소문자 정규화 (공백·특수문자 제거) */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\uAC00-\uD7A3\u1100-\u11FF\uA960-\uA97Fa-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── 엔진 ───────────────────────────────────────────────────────────────────

const SIMILARITY_THRESHOLD = 0.62; // 이 이상이면 DB 매칭으로 인정

export class RecommendGoodsEngine {
  constructor(
    private goodsTermPort: IGoodsTermPort,
    private llmPort: ILLMPort,
    private similarGoodsPort?: SimilarGoodsLookupPort
  ) {}

  async recommend(
    request: CandidateGenerationRequest
  ): Promise<GeneratedCandidate[]> {
    const targetCount = request.count ?? 8;
    const classNo = request.classNo;

    // 1. DB에서 전체 용어 가져오기
    const [officialTerms, similarTerms] = await Promise.all([
      this.goodsTermPort.findOfficialMatches(request.goodsDescription, classNo),
      this.goodsTermPort.findSimilarMatches(request.goodsDescription, classNo),
    ]);

    // 2. 유사도 스코어링
    const queryText = `${request.proposedMarkName} ${request.goodsDescription}`;

    type ScoredTerm = {
      term: string;
      classNo: number;
      sourceType: "official_notice_name" | "accepted_similar_name";
      similarityGroupCodes: string[];
      score: number;
    };

    const score = (term: string): number => {
      const normTerm = normalize(term);
      const words = normalize(queryText)
        .split(" ")
        .filter(Boolean);
      if (words.length === 0) return 0;
      const scores = words.map((w) => jaroWinkler(normTerm, w));
      // 단어별 최고 유사도와 전체 문장 유사도의 가중 평균
      const maxWord = Math.max(...scores);
      const fullSentence = jaroWinkler(normTerm, normalize(queryText));
      return maxWord * 0.7 + fullSentence * 0.3;
    };

    const scoredOfficial: ScoredTerm[] = officialTerms.map((t) => ({
      ...t,
      sourceType: "official_notice_name" as const,
      score: score(t.term),
    }));

    const scoredSimilar: ScoredTerm[] = similarTerms.map((t) => ({
      ...t,
      sourceType: "accepted_similar_name" as const,
      score: score(t.term),
    }));

    // 3. 임계값 이상 필터 + 정렬 (공식 명칭 우선)
    const dbMatches: GeneratedCandidate[] = [
      ...scoredOfficial,
      ...scoredSimilar,
    ]
      .filter((t) => t.score >= SIMILARITY_THRESHOLD)
      .sort((a, b) => {
        // 공식 명칭 우선, 동점이면 점수 순
        if (
          a.sourceType === "official_notice_name" &&
          b.sourceType !== "official_notice_name"
        )
          return -1;
        if (
          a.sourceType !== "official_notice_name" &&
          b.sourceType === "official_notice_name"
        )
          return 1;
        return b.score - a.score;
      })
      .slice(0, targetCount)
      .map((t) => ({
        term: t.term,
        normalizedTerm: t.term,
        classNo: t.classNo,
        sourceType: t.sourceType,
        confidence: parseFloat(t.score.toFixed(3)),
        rationale:
          t.sourceType === "official_notice_name"
            ? `특허청 고시 상품명칭 DB 매칭 (유사도 ${Math.round(t.score * 100)}%)`
            : `유사 인정 명칭 DB 매칭 (유사도 ${Math.round(t.score * 100)}%)`,
        similarityGroupCodes: t.similarityGroupCodes,
      }));

    // 4. DB 결과가 충분하면 그대로 반환
    if (dbMatches.length >= targetCount) {
      return dbMatches;
    }

    // 4. KIPRIS 유사상품군 검색 결과를 후보 설계에 반영
    const kiprisMatches = await this.findKiprisSimilarGoods(request, targetCount - dbMatches.length);
    const mergedEvidenceMatches = dedupeCandidates([...dbMatches, ...kiprisMatches]).slice(0, targetCount);

    if (mergedEvidenceMatches.length >= targetCount) {
      return mergedEvidenceMatches;
    }

    // 5. 부족한 수만큼 LLM 후보 추가 생성
    const needed = targetCount - mergedEvidenceMatches.length;
    const existingTermNames = new Set(mergedEvidenceMatches.map((c) => c.normalizedTerm ?? c.term));

    let aiCandidates: GeneratedCandidate[] = [];
    try {
      aiCandidates = await this.llmPort.generateCandidates({
        ...request,
        count: needed + 2, // 중복 제거 여유분
      });
    } catch {
      // LLM 실패 시 DB 결과만 반환
    }

    // 6. 중복 제거 (DB에 이미 있는 용어 제외)
    const deduped = aiCandidates
      .filter((c) => !existingTermNames.has(c.normalizedTerm ?? c.term))
      .slice(0, needed);

    return [...mergedEvidenceMatches, ...deduped];
  }

  private async findKiprisSimilarGoods(
    request: CandidateGenerationRequest,
    limit: number
  ): Promise<GeneratedCandidate[]> {
    if (!this.similarGoodsPort || limit <= 0) return [];

    const queries = buildSimilarGoodsQueries(request.goodsDescription);
    const candidates: GeneratedCandidate[] = [];

    for (const query of queries) {
      try {
        const items = await this.similarGoodsPort.searchSimilarGoods(query, request.classNo);
        for (const item of items) {
          const classNo = parseInt(item.classNo, 10);
          if (!item.goodsName || !Number.isFinite(classNo)) continue;

          candidates.push({
            term: item.goodsName,
            normalizedTerm: item.goodsName,
            classNo,
            sourceType: "accepted_similar_name",
            confidence: 0.82,
            rationale: `KIPRIS 유사상품군 검색("${query}") 결과를 반영했습니다. 유사군 코드: ${item.similarCode || "미상"}`,
            similarityGroupCodes: item.similarCode ? [item.similarCode] : [],
          });
        }
      } catch (error) {
        console.warn(`[RecommendGoodsEngine] KIPRIS 유사상품군 검색 실패 (query=${query}):`, error);
      }

      if (candidates.length >= limit) break;
    }

    return dedupeCandidates(candidates).slice(0, limit);
  }
}

function buildSimilarGoodsQueries(goodsDescription: string): string[] {
  const normalized = goodsDescription
    .replace(/[()[\]{}]/g, " ")
    .replace(/\bDXNewton\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = normalized
    .split(/[,，;；/\n]| 및 | 또는 | 관련 | 검토 | 지시 | 드립니다|해주세요|합니다|출원|상표/g)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 40);

  return Array.from(new Set([normalized, ...parts]))
    .filter((query) => query.length >= 2 && query.length <= 80)
    .slice(0, 4);
}

function dedupeCandidates(candidates: GeneratedCandidate[]): GeneratedCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.classNo}:${normalize(candidate.normalizedTerm ?? candidate.term)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
