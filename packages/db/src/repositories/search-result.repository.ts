import type { ISearchResultRepository, SearchResult } from "@ip-review/domain";
import { prisma } from "../client";

export class SearchResultRepository implements ISearchResultRepository {
  async create(input: any): Promise<SearchResult> {
    return prisma.searchResult.create({
      data: {
        searchJobId: input.searchJobId,
        sourceSystem: input.sourceSystem,
        mode: input.mode,
        applicationNumber: input.applicationNumber,
        registerNumber: input.registerNumber,
        markName: input.markName,
        applicantName: input.applicantName,
        classNo: input.classNo,
        designatedGoodsSummary: input.designatedGoodsSummary,
        statusLabel: input.statusLabel,
        sampleImageUrl: input.sampleImageUrl,
        relevanceScore: input.relevanceScore,
        detailJson: input.detailJson,
        rawXml: input.rawXml,
        isShortlisted: input.isShortlisted || false,
      },
    }) as Promise<SearchResult>;
  }

  async findById(id: string): Promise<SearchResult | null> {
    return prisma.searchResult.findUnique({
      where: { id },
      include: { similarityGroups: true },
    }) as Promise<SearchResult | null>;
  }

  async update(id: string, input: any): Promise<SearchResult> {
    return prisma.searchResult.update({
      where: { id },
      data: {
        ...(input.isShortlisted !== undefined && { isShortlisted: input.isShortlisted }),
        ...(input.relevanceScore !== undefined && { relevanceScore: input.relevanceScore }),
      },
      include: { similarityGroups: true },
    }) as Promise<SearchResult>;
  }

  async delete(id: string): Promise<void> {
    await prisma.searchResult.delete({ where: { id } });
  }

  async list(): Promise<any> {
    throw new Error("Use specific query methods instead");
  }

  async findBySearchJob(searchJobId: string): Promise<SearchResult[]> {
    return prisma.searchResult.findMany({
      where: { searchJobId },
      orderBy: { createdAt: "desc" },
      include: { similarityGroups: true },
    }) as Promise<SearchResult[]>;
  }

  async findShortlistedByJob(searchJobId: string): Promise<SearchResult[]> {
    return prisma.searchResult.findMany({
      where: {
        searchJobId,
        isShortlisted: true,
      },
      orderBy: { relevanceScore: "desc" },
      include: { similarityGroups: true },
    }) as Promise<SearchResult[]>;
  }

  async bulkCreate(results: any[]): Promise<SearchResult[]> {
    return Promise.all(
      results.map((result) => this.create(result))
    );
  }
}
