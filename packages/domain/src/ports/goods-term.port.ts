/**
 * 상품 분류 DB 포트 (IGoodsTermPort)
 * DB 스키마의 GoodsTerm 테이블에 대한 인터페이스.
 * llm-engine은 이 인터페이스에만 의존 — 구현체(db 패키지)와 분리.
 */

export interface GoodsTermMatch {
  term: string;
  classNo: number;
  termType: 'official_notice_name' | 'accepted_similar_name';
  similarityGroupCodes: string[];
}

export interface IGoodsTermPort {
  /**
   * 입력 텍스트와 유사한 공식 고시 명칭을 검색합니다.
   * GoodsTerm.termType = official_notice_name
   */
  findOfficialMatches(query: string, classNo?: number): Promise<GoodsTermMatch[]>;

  /**
   * 입력 텍스트와 유사한 유사 인정 명칭을 검색합니다.
   * GoodsTerm.termType = accepted_similar_name
   */
  findSimilarMatches(query: string, classNo?: number): Promise<GoodsTermMatch[]>;
}
