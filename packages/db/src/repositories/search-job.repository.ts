import type { ISearchJobRepository, SearchJob, CreateSearchJobInput, UpdateSearchJobInput, ListOptions, ListResult } from "@ip-review/domain";
import { prisma } from "../client";

export class SearchJobRepository implements ISearchJobRepository {
  async create(input: CreateSearchJobInput): Promise<SearchJob> {
    return prisma.searchJob.create({
      data: {
        inquiryId: input.inquiryId,
        candidateRunId: input.candidateRunId,
        createdByUserId: input.createdByUserId,
        queryStrategy: input.queryStrategy,
        state: "queued",
      },
    }) as Promise<SearchJob>;
  }

  async findById(id: string): Promise<SearchJob | null> {
    return prisma.searchJob.findUnique({
      where: { id },
      include: { queries: true, results: true },
    }) as Promise<SearchJob | null>;
  }

  async update(id: string, input: UpdateSearchJobInput): Promise<SearchJob> {
    return prisma.searchJob.update({
      where: { id },
      data: {
        ...(input.state && { state: input.state }),
        ...(input.completedAt && { completedAt: input.completedAt }),
      },
      include: { queries: true, results: true },
    }) as Promise<SearchJob>;
  }

  async delete(id: string): Promise<void> {
    await prisma.searchJob.delete({ where: { id } });
  }

  async list(options?: ListOptions): Promise<ListResult<SearchJob>> {
    const skip = options?.skip || 0;
    const take = options?.take || 20;

    const [items, total] = await Promise.all([
      prisma.searchJob.findMany({
        skip,
        take,
        where: options?.where,
        orderBy: options?.orderBy || { createdAt: "desc" },
        include: { queries: true, results: true },
      }),
      prisma.searchJob.count({ where: options?.where }),
    ]);

    return {
      items: items as SearchJob[],
      total,
      skip,
      take,
    };
  }

  async findByInquiry(inquiryId: string): Promise<SearchJob[]> {
    return prisma.searchJob.findMany({
      where: { inquiryId },
      orderBy: { createdAt: "desc" },
      include: { queries: true, results: true },
    }) as Promise<SearchJob[]>;
  }

  async findByState(
    state: string,
    options?: ListOptions
  ): Promise<ListResult<SearchJob>> {
    return this.list({
      ...options,
      where: { state },
    });
  }

  async findPendingJobs(limit: number = 10): Promise<SearchJob[]> {
    return prisma.searchJob.findMany({
      where: {
        state: { in: ["queued", "running"] },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: { queries: true, results: true },
    }) as Promise<SearchJob[]>;
  }
}
