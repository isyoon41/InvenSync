import type { IReviewReportRepository, ReviewReport, CreateReviewReportInput, UpdateReviewReportInput, ListOptions, ListResult } from "@ip-review/domain";
import { prisma } from "../client";

export class ReviewReportRepository implements IReviewReportRepository {
  async create(input: CreateReviewReportInput): Promise<ReviewReport> {
    return prisma.reviewReport.create({
      data: {
        inquiryId: input.inquiryId,
        candidateRunId: input.candidateRunId,
        searchJobId: input.searchJobId,
        summary: input.summary,
        riskNote: input.riskNote,
        recommendation: input.recommendation,
        clientReplyDraft: input.clientReplyDraft,
        internalNote: input.internalNote,
      },
      include: { evidences: true, inquiry: { select: { proposedMarkName: true, title: true } } },
    }) as Promise<ReviewReport>;
  }

  async findById(id: string): Promise<ReviewReport | null> {
    return prisma.reviewReport.findUnique({
      where: { id },
      include: { evidences: true, inquiry: { select: { proposedMarkName: true, title: true } } },
    }) as Promise<ReviewReport | null>;
  }

  async update(id: string, input: UpdateReviewReportInput): Promise<ReviewReport> {
    return prisma.reviewReport.update({
      where: { id },
      data: {
        ...(input.summary !== undefined && { summary: input.summary }),
        ...(input.riskNote !== undefined && { riskNote: input.riskNote }),
        ...(input.recommendation !== undefined && { recommendation: input.recommendation }),
        ...(input.clientReplyDraft !== undefined && { clientReplyDraft: input.clientReplyDraft }),
        ...(input.internalNote !== undefined && { internalNote: input.internalNote }),
      },
      include: { evidences: true, inquiry: { select: { proposedMarkName: true, title: true } } },
    }) as Promise<ReviewReport>;
  }

  async delete(id: string): Promise<void> {
    await prisma.reviewReport.delete({ where: { id } });
  }

  async list(options?: ListOptions): Promise<ListResult<ReviewReport>> {
    const skip = options?.skip || 0;
    const take = options?.take || 20;

    const [items, total] = await Promise.all([
      prisma.reviewReport.findMany({
        skip,
        take,
        where: options?.where,
        orderBy: options?.orderBy || { createdAt: "desc" },
        include: { evidences: true, inquiry: { select: { proposedMarkName: true, title: true } } },
      }),
      prisma.reviewReport.count({ where: options?.where }),
    ]);

    return {
      items: items as ReviewReport[],
      total,
      skip,
      take,
    };
  }

  async findByInquiry(inquiryId: string): Promise<ReviewReport[]> {
    return prisma.reviewReport.findMany({
      where: { inquiryId },
      orderBy: { createdAt: "desc" },
      include: { evidences: true, inquiry: { select: { proposedMarkName: true, title: true } } },
    }) as Promise<ReviewReport[]>;
  }

  async findLatestByInquiry(inquiryId: string): Promise<ReviewReport | null> {
    return prisma.reviewReport.findFirst({
      where: { inquiryId },
      orderBy: { createdAt: "desc" },
      include: { evidences: true, inquiry: { select: { proposedMarkName: true, title: true } } },
    }) as Promise<ReviewReport | null>;
  }

  async findPendingApproval(firmId: string): Promise<ReviewReport[]> {
    return prisma.reviewReport.findMany({
      where: {
        inquiry: { firmId },
        approvedByUserId: null,
      },
      orderBy: { createdAt: "asc" },
      include: { evidences: true, inquiry: { select: { proposedMarkName: true, title: true } } },
    }) as Promise<ReviewReport[]>;
  }

  async findApprovedReports(
    firmId: string,
    since: Date,
    options?: ListOptions
  ): Promise<ListResult<ReviewReport>> {
    return this.list({
      ...options,
      where: {
        inquiry: { firmId },
        approvedAt: { gte: since },
      },
    });
  }
}
