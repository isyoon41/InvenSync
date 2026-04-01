import type { ICandidateRepository, GoodsCandidate, CreateGoodsCandidateInput, UpdateGoodsCandidateInput } from "@ip-review/domain";
import { prisma } from "../client";

export class CandidateRepository implements ICandidateRepository {
  async create(input: CreateGoodsCandidateInput): Promise<GoodsCandidate> {
    return prisma.goodsCandidate.create({
      data: {
        candidateRunId: input.candidateRunId,
        term: input.term,
        normalizedTerm: input.normalizedTerm,
        classNo: input.classNo,
        sourceType: input.sourceType,
        confidence: input.confidence || 0,
        rationale: input.rationale,
        isSelected: input.isSelected || false,
        sortOrder: input.sortOrder || 0,
      },
    }) as Promise<GoodsCandidate>;
  }

  async findById(id: string): Promise<GoodsCandidate | null> {
    return prisma.goodsCandidate.findUnique({
      where: { id },
      include: { similarityGroups: true },
    }) as Promise<GoodsCandidate | null>;
  }

  async update(id: string, input: UpdateGoodsCandidateInput): Promise<GoodsCandidate> {
    return prisma.goodsCandidate.update({
      where: { id },
      data: {
        ...(input.isSelected !== undefined && { isSelected: input.isSelected }),
        ...(input.confidence !== undefined && { confidence: input.confidence }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.rationale && { rationale: input.rationale }),
      },
      include: { similarityGroups: true },
    }) as Promise<GoodsCandidate>;
  }

  async delete(id: string): Promise<void> {
    await prisma.goodsCandidate.delete({ where: { id } });
  }

  async list(): Promise<any> {
    throw new Error("Use specific query methods instead");
  }

  async findByCandidateRun(candidateRunId: string): Promise<GoodsCandidate[]> {
    return prisma.goodsCandidate.findMany({
      where: { candidateRunId },
      orderBy: { sortOrder: "asc" },
      include: { similarityGroups: true },
    }) as Promise<GoodsCandidate[]>;
  }

  async findSelectedByRun(candidateRunId: string): Promise<GoodsCandidate[]> {
    return prisma.goodsCandidate.findMany({
      where: {
        candidateRunId,
        isSelected: true,
      },
      orderBy: { sortOrder: "asc" },
      include: { similarityGroups: true },
    }) as Promise<GoodsCandidate[]>;
  }

  async updateSortOrder(
    candidateId: string,
    newOrder: number
  ): Promise<GoodsCandidate> {
    return prisma.goodsCandidate.update({
      where: { id: candidateId },
      data: { sortOrder: newOrder },
      include: { similarityGroups: true },
    }) as Promise<GoodsCandidate>;
  }
}
