/**
 * GoodsTermRepository — IGoodsTermPort 의 Prisma 구현체
 * GoodsTerm 테이블에서 공식 고시 명칭 / 유사 인정 명칭을 조회합니다.
 */

import type { IGoodsTermPort, GoodsTermMatch } from "@ip-review/domain";
import { prisma } from "../client";

export class GoodsTermRepository implements IGoodsTermPort {
  /**
   * 공식 고시 명칭(official_notice_name) 전체 조회.
   * query 파라미터는 엔진 레이어에서 유사도 필터링에 사용됩니다.
   */
  async findOfficialMatches(
    _query: string,
    classNo?: number
  ): Promise<GoodsTermMatch[]> {
    const terms = await prisma.goodsTerm.findMany({
      where: {
        isActive: true,
        termType: "official_notice_name",
        ...(classNo ? { classNo } : {}),
      },
      include: { similarityGroups: true },
    });

    return terms.map((t) => ({
      term: t.term,
      classNo: t.classNo,
      termType: "official_notice_name" as const,
      similarityGroupCodes: t.similarityGroups.map(
        (sg) => sg.similarityGroupCode
      ),
    }));
  }

  /**
   * 유사 인정 명칭(accepted_similar_name) 전체 조회.
   */
  async findSimilarMatches(
    _query: string,
    classNo?: number
  ): Promise<GoodsTermMatch[]> {
    const terms = await prisma.goodsTerm.findMany({
      where: {
        isActive: true,
        termType: "accepted_similar_name",
        ...(classNo ? { classNo } : {}),
      },
      include: { similarityGroups: true },
    });

    return terms.map((t) => ({
      term: t.term,
      classNo: t.classNo,
      termType: "accepted_similar_name" as const,
      similarityGroupCodes: t.similarityGroups.map(
        (sg) => sg.similarityGroupCode
      ),
    }));
  }
}
