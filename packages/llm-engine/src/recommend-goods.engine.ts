import type {
  CandidateGenerationRequest,
  CandidateReferenceGoods,
  GeneratedCandidate,
  IGoodsTermPort,
  ILLMPort,
} from "@ip-review/domain";

export interface SimilarGoodsLookupPort {
  searchSimilarGoods(
    query: string,
    classNo?: number
  ): Promise<Array<{ goodsName: string; similarCode: string; classNo: string }>>;
}

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

  for (let i = 0; i < sLen; i += 1) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, tLen);
    for (let j = start; j < end; j += 1) {
      if (tMatches[j] || s[i] !== t[j]) continue;
      sMatches[i] = true;
      tMatches[j] = true;
      matches += 1;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < sLen; i += 1) {
    if (!sMatches[i]) continue;
    while (!tMatches[k]) k += 1;
    if (s[i] !== t[k]) transpositions += 1;
    k += 1;
  }

  return (matches / sLen + matches / tLen + (matches - transpositions / 2) / matches) / 3;
}

function jaroWinkler(s: string, t: string, p = 0.1): number {
  const jaro = jaroSimilarity(s, t);
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(s.length, t.length));
  for (let i = 0; i < maxPrefix; i += 1) {
    if (s[i] === t[i]) prefix += 1;
    else break;
  }
  return jaro + prefix * p * (1 - jaro);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\uAC00-\uD7A3\u1100-\u11FF\uA960-\uA97Fa-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toGeneratedSourceType(
  sourceType: CandidateReferenceGoods["sourceType"]
): GeneratedCandidate["sourceType"] {
  return sourceType === "internal_official_notice_name" ? "official_notice_name" : "accepted_similar_name";
}

function mergeEvidenceIntoCandidates(
  candidates: GeneratedCandidate[],
  evidence: CandidateReferenceGoods[]
): GeneratedCandidate[] {
  const evidenceByKey = new Map<string, CandidateReferenceGoods>();
  for (const item of evidence) {
    evidenceByKey.set(`${item.classNo}:${normalize(item.normalizedTerm || item.term)}`, item);
  }

  return candidates.map((candidate) => {
    const key = `${candidate.classNo}:${normalize(candidate.normalizedTerm || candidate.term)}`;
    const matched = evidenceByKey.get(key);
    if (!matched) return candidate;

    return {
      ...candidate,
      sourceType:
        candidate.sourceType === "ai_generated" ? toGeneratedSourceType(matched.sourceType) : candidate.sourceType,
      similarityGroupCodes:
        candidate.similarityGroupCodes?.length ? candidate.similarityGroupCodes : matched.similarityGroupCodes,
      rationale: candidate.rationale || matched.rationale,
      confidence: Math.max(candidate.confidence, matched.confidence),
    };
  });
}

const SIMILARITY_THRESHOLD = 0.62;

export class RecommendGoodsEngine {
  constructor(
    private goodsTermPort: IGoodsTermPort,
    private llmPort: ILLMPort,
    private similarGoodsPort: SimilarGoodsLookupPort
  ) {}

  async recommend(request: CandidateGenerationRequest): Promise<GeneratedCandidate[]> {
    const targetCount = request.count ?? 8;
    const [kiprisEvidence, internalEvidence] = await Promise.all([
      this.findKiprisSimilarGoodsEvidence(request, targetCount * 2),
      this.findInternalGoodsEvidence(request, targetCount * 2),
    ]);

    const referenceGoods = dedupeEvidence([...kiprisEvidence, ...internalEvidence]).slice(
      0,
      Math.max(targetCount * 3, 24)
    );

    const claudeCandidates = await this.llmPort.generateCandidates({
      ...request,
      count: targetCount,
      referenceGoods,
      evidencePolicy:
        "KIPRIS similar-goods evidence must be reviewed first. Internal DB matches are secondary reference evidence. Claude must make the final selection and may use AI-generated candidates only when KIPRIS/internal evidence is insufficient.",
    });

    return mergeEvidenceIntoCandidates(claudeCandidates, referenceGoods).slice(0, targetCount);
  }

  private async findInternalGoodsEvidence(
    request: CandidateGenerationRequest,
    limit: number
  ): Promise<CandidateReferenceGoods[]> {
    const classNos = classFilters(request);
    const [officialTermGroups, similarTermGroups] = await Promise.all([
      Promise.all(classNos.map((classNo) => this.goodsTermPort.findOfficialMatches(request.goodsDescription, classNo))),
      Promise.all(classNos.map((classNo) => this.goodsTermPort.findSimilarMatches(request.goodsDescription, classNo))),
    ]);
    const officialTerms = officialTermGroups.flat();
    const similarTerms = similarTermGroups.flat();

    const queryText = `${request.proposedMarkName} ${request.goodsDescription}`;
    const score = (term: string): number => {
      const normTerm = normalize(term);
      const words = normalize(queryText)
        .split(" ")
        .filter(Boolean);
      if (words.length === 0) return 0;
      const scores = words.map((word) => jaroWinkler(normTerm, word));
      const maxWord = Math.max(...scores);
      const fullSentence = jaroWinkler(normTerm, normalize(queryText));
      return maxWord * 0.7 + fullSentence * 0.3;
    };

    return [
      ...officialTerms.map((term) => ({
        term,
        sourceType: "internal_official_notice_name" as const,
      })),
      ...similarTerms.map((term) => ({
        term,
        sourceType: "internal_accepted_similar_name" as const,
      })),
    ]
      .map(({ term, sourceType }) => ({
        term: term.term,
        normalizedTerm: term.term,
        classNo: term.classNo,
        sourceType,
        confidence: Number(score(term.term).toFixed(3)),
        rationale:
          sourceType === "internal_official_notice_name"
            ? "Internal official notice-name DB reference. Claude must verify suitability before selecting."
            : "Internal accepted similar-name DB reference. Claude must verify suitability before selecting.",
        similarityGroupCodes: term.similarityGroupCodes,
      }))
      .filter((term) => term.confidence >= SIMILARITY_THRESHOLD)
      .sort((a, b) => {
        if (a.sourceType === "internal_official_notice_name" && b.sourceType !== "internal_official_notice_name") {
          return -1;
        }
        if (a.sourceType !== "internal_official_notice_name" && b.sourceType === "internal_official_notice_name") {
          return 1;
        }
        return b.confidence - a.confidence;
      })
      .slice(0, limit);
  }

  private async findKiprisSimilarGoodsEvidence(
    request: CandidateGenerationRequest,
    limit: number
  ): Promise<CandidateReferenceGoods[]> {
    const queries = buildSimilarGoodsQueries(request.goodsDescription);
    const classNos = classFilters(request);
    const candidates: CandidateReferenceGoods[] = [];

    for (const query of queries) {
      for (const requestedClassNo of classNos) {
        const items = await this.similarGoodsPort.searchSimilarGoods(query, requestedClassNo);
        for (const item of items) {
          const classNo = parseInt(item.classNo, 10);
          if (!item.goodsName || !Number.isFinite(classNo)) continue;

          candidates.push({
            term: item.goodsName,
            normalizedTerm: item.goodsName,
            classNo,
            sourceType: "kipris_similar_goods",
            confidence: 0.9,
            rationale: `KIPRIS similar-goods search result for "${query}"${
              requestedClassNo ? ` in class ${requestedClassNo}` : ""
            }. Similarity group code: ${item.similarCode || "unknown"}.`,
            similarityGroupCodes: item.similarCode ? [item.similarCode] : [],
            query,
          });
        }

        if (candidates.length >= limit) break;
      }

      if (candidates.length >= limit) break;
    }

    return dedupeEvidence(candidates).slice(0, limit);
  }
}

function buildSimilarGoodsQueries(goodsDescription: string): string[] {
  const normalized = goodsDescription
    .replace(/[()[\]{}]/g, " ")
    .replace(/\bDXNewton\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = normalized
    .split(/[,;，、\n]| 및 | 또는 | 관련 | 검토 | 지정 | 서비스|해주세요|합니다|출원|상표/g)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 40);

  return Array.from(new Set([normalized, ...parts]))
    .filter((query) => query.length >= 2 && query.length <= 80)
    .slice(0, 4);
}

function classFilters(request: CandidateGenerationRequest): Array<number | undefined> {
  const classNos = Array.from(
    new Set(
      (request.targetClasses ?? []).filter(
        (classNo) => Number.isInteger(classNo) && classNo > 0 && classNo <= 45
      )
    )
  );
  if (classNos.length > 0) return classNos;
  return [request.classNo];
}

function dedupeEvidence(candidates: CandidateReferenceGoods[]): CandidateReferenceGoods[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.classNo}:${normalize(candidate.normalizedTerm || candidate.term)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
