/**
 * KIPRIS Open API 실제 어댑터
 * ITrademarkSearchPort 구현체
 */

import type {
  ITrademarkSearchPort,
  TrademarkSearchRequest,
  TrademarkSearchResponse,
} from '@ip-review/domain';
import { parseKiprisXml, parseSimilarGoodsXml } from './kipris-xml-parser';
import type { KiprisSimilarGoodsItem } from './kipris-xml-parser';

export type { KiprisSimilarGoodsItem };

const KIPRIS_BASE_URL = 'http://plus.kipris.or.kr/openapi/rest';

// ── 문자열 유사도: Jaro-Winkler (0~1) ──────────────────────────────────────
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array<boolean>(len1).fill(false);
  const s2Matches = new Array<boolean>(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

function jaroWinkler(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

/** 상표명 비교용 정규화: 소문자 + 공백·특수문자 제거 */
function normalizeForCompare(name: string): string {
  return name.toLowerCase().replace(/[\s\-_.,·]/g, '');
}

function computeRelevance(queryMark: string, resultMark: string): number {
  const q = normalizeForCompare(queryMark);
  const r = normalizeForCompare(resultMark);
  return Math.round(jaroWinkler(q, r) * 100) / 100;
}

// 월 1,000건 무료 제한 대비 메모리 캐시 (프로세스 내)
// 운영 환경에서는 Redis로 교체 권장
const memoryCache = new Map<string, { data: TrademarkSearchResponse[]; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24시간

function buildSearchUrl(serviceEndpoint: string, params: Record<string, string>): string {
  const url = new URL(`${KIPRIS_BASE_URL}/${serviceEndpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export class KiprisAdapter implements ITrademarkSearchPort {
  constructor(private readonly accessKey: string) {}

  getSourceSystem() {
    return 'kipris' as const;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // 간단한 ping 검색으로 API 가용성 확인
      const url = buildSearchUrl('trademarkInfoSearchService/trademarkInfoSearch', {
        serviceName: '테스트',
        pageNo: '1',
        numOfRows: '1',
        accessKey: this.accessKey,
      });
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  getCacheKey(request: TrademarkSearchRequest): string {
    return `kipris:${request.mode}:${JSON.stringify(request.params)}`;
  }

  async search(request: TrademarkSearchRequest): Promise<TrademarkSearchResponse[]> {
    const cacheKey = this.getCacheKey(request);
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    let results: TrademarkSearchResponse[] = [];

    switch (request.mode) {
      case 'exact_mark':
      case 'mark_keyword':
        results = await this.searchByMarkName(request);
        break;
      case 'similarity_group':
        results = await this.searchBySimilarityGroup(request);
        break;
      case 'designated_goods':
        results = await this.searchByDesignatedGoods(request);
        break;
      default:
        results = await this.searchByMarkName(request);
    }

    memoryCache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
    return results;
  }

  private async searchByMarkName(request: TrademarkSearchRequest): Promise<TrademarkSearchResponse[]> {
    const { markName, classNo } = request.params;
    if (!markName) return [];

    const params: Record<string, string> = {
      serviceName: markName,
      pageNo: '1',
      numOfRows: '20',
      accessKey: this.accessKey,
    };
    if (classNo !== undefined) {
      params.ClassNo = String(classNo).padStart(2, '0');
    }

    const url = buildSearchUrl('trademarkInfoSearchService/trademarkInfoSearch', params);
    const xml = await this.fetchXml(url);
    if (!xml) return [];

    const parsed = parseKiprisXml(xml);
    if (parsed.resultCode !== '00') {
      console.warn(`[KiprisAdapter] API 오류: ${parsed.resultCode} - ${parsed.resultMsg}`);
      return [];
    }

    return parsed.items
      .map((item) => {
        const resultMark = item.trademarkName || markName;
        return {
          applicationNumber: item.applicationNumber || undefined,
          registerNumber: item.registerNumber || undefined,
          markName: resultMark,
          applicantName: item.applicantName || undefined,
          classNo: item.classificationCode ? parseInt(item.classificationCode, 10) : undefined,
          designatedGoodsSummary: item.designatedGoods || undefined,
          statusLabel: item.applicationStatus || undefined,
          sampleImageUrl: item.drawing || undefined,
          relevanceScore: computeRelevance(markName, resultMark),
          rawResponse: { ...item },
          rawXml: xml,
        };
      })
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  }

  private async searchBySimilarityGroup(request: TrademarkSearchRequest): Promise<TrademarkSearchResponse[]> {
    const { similarityGroupCode, classNo } = request.params;
    if (!similarityGroupCode) return [];

    const params: Record<string, string> = {
      similarityCode: similarityGroupCode,
      pageNo: '1',
      numOfRows: '20',
      accessKey: this.accessKey,
    };
    if (classNo !== undefined) {
      params.ClassNo = String(classNo).padStart(2, '0');
    }

    const url = buildSearchUrl('trademarkInfoSearchService/trademarkInfoSearch', params);
    const xml = await this.fetchXml(url);
    if (!xml) return [];

    const parsed = parseKiprisXml(xml);
    if (parsed.resultCode !== '00') return [];

    return parsed.items.map((item) => ({
      applicationNumber: item.applicationNumber || undefined,
      registerNumber: item.registerNumber || undefined,
      markName: item.trademarkName || '',
      applicantName: item.applicantName || undefined,
      classNo: item.classificationCode ? parseInt(item.classificationCode, 10) : undefined,
      designatedGoodsSummary: item.designatedGoods || undefined,
      statusLabel: item.applicationStatus || undefined,
      sampleImageUrl: item.drawing || undefined,
      relevanceScore: undefined,
      rawResponse: { ...item },
      rawXml: xml,
    }));
  }

  private async searchByDesignatedGoods(request: TrademarkSearchRequest): Promise<TrademarkSearchResponse[]> {
    const { goodsDescription, classNo } = request.params;
    if (!goodsDescription) return [];

    const params: Record<string, string> = {
      goodsName: goodsDescription,
      pageNo: '1',
      numOfRows: '20',
      accessKey: this.accessKey,
    };
    if (classNo !== undefined) {
      params.ClassNo = String(classNo).padStart(2, '0');
    }

    const url = buildSearchUrl('trademarkInfoSearchService/trademarkInfoSearch', params);
    const xml = await this.fetchXml(url);
    if (!xml) return [];

    const parsed = parseKiprisXml(xml);
    if (parsed.resultCode !== '00') return [];

    return parsed.items.map((item) => ({
      applicationNumber: item.applicationNumber || undefined,
      registerNumber: item.registerNumber || undefined,
      markName: item.trademarkName || '',
      applicantName: item.applicantName || undefined,
      classNo: item.classificationCode ? parseInt(item.classificationCode, 10) : undefined,
      designatedGoodsSummary: item.designatedGoods || undefined,
      statusLabel: item.applicationStatus || undefined,
      sampleImageUrl: item.drawing || undefined,
      relevanceScore: undefined,
      rawResponse: { ...item },
      rawXml: xml,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 유사상품 검색: 상품명 → 유사군코드 + 동일 유사군 상품 목록
  // ─────────────────────────────────────────────────────────────────────────
  async searchSimilarGoods(
    query: string,
    classNo?: number
  ): Promise<KiprisSimilarGoodsItem[]> {
    const cacheKey = `similar-goods:${query}:${classNo ?? ''}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as unknown as KiprisSimilarGoodsItem[];
    }

    const params: Record<string, string> = {
      query,
      pageNo: '1',
      numOfRows: '50',
      accessKey: this.accessKey,
    };
    if (classNo !== undefined) {
      params.classNo = String(classNo).padStart(2, '0');
    }

    const url = buildSearchUrl('goodsSimilarCodeService/goodsSimilarCodeSearch', params);
    const xml = await this.fetchXml(url);
    if (!xml) return [];

    const parsed = parseSimilarGoodsXml(xml);
    if (parsed.resultCode !== '00') {
      console.warn(`[KiprisAdapter] 유사상품 API 오류: ${parsed.resultCode} - ${parsed.resultMsg}`);
      return [];
    }

    memoryCache.set(cacheKey, {
      data: parsed.items as unknown as TrademarkSearchResponse[],
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return parsed.items;
  }

  private async fetchXml(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/xml, text/xml' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        console.error(`[KiprisAdapter] HTTP ${res.status}: ${url}`);
        return null;
      }
      return await res.text();
    } catch (err) {
      console.error('[KiprisAdapter] fetch 실패:', err);
      return null;
    }
  }
}
