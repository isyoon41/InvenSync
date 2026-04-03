/**
 * KIPRIS Open API 실제 어댑터
 * ITrademarkSearchPort 구현체
 */

import type {
  ITrademarkSearchPort,
  TrademarkSearchRequest,
  TrademarkSearchResponse,
} from '@ip-review/domain';
import { parseKiprisXml } from './kipris-xml-parser.js';

const KIPRIS_BASE_URL = 'http://plus.kipris.or.kr/openapi/rest';

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

    return parsed.items.map((item) => ({
      applicationNumber: item.applicationNumber || undefined,
      registerNumber: item.registerNumber || undefined,
      markName: item.trademarkName || markName,
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
