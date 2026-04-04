/**
 * KIPRIS Open API XML 응답 파서
 * CLAUDE.md 규칙: KIPRIS XML은 이 패키지에서만 JSON으로 변환
 */

export interface KiprisTrademarkItem {
  applicationNumber: string;
  registerNumber: string;
  applicationDate: string;
  publicationDate: string;
  registrationDate: string;
  applicationStatus: string;
  applicantName: string;
  trademarkName: string;
  classificationCode: string;
  similarityCodes: string[];
  designatedGoods: string;
  drawing: string;
}

export interface KiprisSearchResponse {
  resultCode: string;
  resultMsg: string;
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  items: KiprisTrademarkItem[];
}

function extractTagValue(xml: string, tag: string): string {
  const patterns = [
    new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i'),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
    new RegExp(`<${tag}\\s*\\/>`, 'i'),
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = xml.match(patterns[i]);
    if (match) {
      if (i === 2) return ''; // self-closing
      return (match[1] || '').trim();
    }
  }
  return '';
}

function extractMultipleTagValues(xml: string, outerTag: string, innerTag: string): string[] {
  const outer = extractTagValue(xml, outerTag);
  if (!outer) return [];

  const values: string[] = [];
  const pattern = new RegExp(`<${innerTag}[^>]*>([\\s\\S]*?)<\\/${innerTag}>`, 'gi');
  let match;
  while ((match = pattern.exec(outer)) !== null) {
    const val = match[1].trim();
    if (val) values.push(val);
  }
  return values;
}

function extractItems(xml: string): string[] {
  const itemsMatch = xml.match(/<items>([\s\S]*?)<\/items>/i);
  if (!itemsMatch) return [];

  const items: string[] = [];
  const pattern = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = pattern.exec(itemsMatch[1])) !== null) {
    items.push(match[1]);
  }
  return items;
}

// ── 유사상품 검색 응답 타입 ────────────────────────────────────────────────
export interface KiprisSimilarGoodsItem {
  goodsName: string;
  similarCode: string;
  classNo: string;
}

export interface KiprisSimilarGoodsResponse {
  resultCode: string;
  resultMsg: string;
  totalCount: number;
  items: KiprisSimilarGoodsItem[];
}

export function parseSimilarGoodsXml(xml: string): KiprisSimilarGoodsResponse {
  const resultCode = extractTagValue(xml, 'resultCode');
  const resultMsg  = extractTagValue(xml, 'resultMsg');
  const totalCount = parseInt(extractTagValue(xml, 'totalCount') || '0', 10);

  const rawItems = extractItems(xml);
  const items: KiprisSimilarGoodsItem[] = rawItems.map((itemXml) => ({
    goodsName:   extractTagValue(itemXml, 'goodsName'),
    similarCode: extractTagValue(itemXml, 'similarCode'),
    classNo:     extractTagValue(itemXml, 'classNo'),
  }));

  return { resultCode, resultMsg, totalCount, items };
}

export function parseKiprisXml(xml: string): KiprisSearchResponse {
  const resultCode = extractTagValue(xml, 'resultCode');
  const resultMsg = extractTagValue(xml, 'resultMsg');
  const totalCount = parseInt(extractTagValue(xml, 'totalCount') || '0', 10);
  const pageNo = parseInt(extractTagValue(xml, 'pageNo') || '1', 10);
  const numOfRows = parseInt(extractTagValue(xml, 'numOfRows') || '10', 10);

  const rawItems = extractItems(xml);
  const items: KiprisTrademarkItem[] = rawItems.map((itemXml) => ({
    applicationNumber: extractTagValue(itemXml, 'applicationNumber'),
    registerNumber: extractTagValue(itemXml, 'registerNumber'),
    applicationDate: extractTagValue(itemXml, 'applicationDate'),
    publicationDate: extractTagValue(itemXml, 'publicationDate'),
    registrationDate: extractTagValue(itemXml, 'registrationDate'),
    applicationStatus: extractTagValue(itemXml, 'applicationStatus'),
    applicantName: extractTagValue(itemXml, 'applicantName'),
    trademarkName: extractTagValue(itemXml, 'trademarkName'),
    classificationCode: extractTagValue(itemXml, 'classificationCode'),
    similarityCodes: extractMultipleTagValues(itemXml, 'similarityCodes', 'value'),
    designatedGoods: extractTagValue(itemXml, 'designatedGoods'),
    drawing: extractTagValue(itemXml, 'drawing'),
  }));

  return { resultCode, resultMsg, totalCount, pageNo, numOfRows, items };
}
