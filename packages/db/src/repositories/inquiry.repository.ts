import type { IInquiryRepository, Inquiry, CreateInquiryInput, UpdateInquiryInput, ListOptions, ListResult, InquiryStatus } from "@ip-review/domain";
import { prisma } from "../client";

export class InquiryRepository implements IInquiryRepository {
  async create(input: CreateInquiryInput): Promise<Inquiry> {
    return prisma.inquiry.create({
      data: {
        firmId: input.firmId,
        clientId: input.clientId,
        inboxAccountId: input.inboxAccountId,
        ownerUserId: input.ownerUserId,
        sourceChannel: input.sourceChannel || "manual",
        title: input.title,
        subject: input.subject,
        rawText: input.rawText,
        rawHtml: input.rawHtml,
        senderEmail: input.senderEmail,
        proposedMarkName: input.proposedMarkName,
        metadata: input.metadata,
      },
    }) as Promise<Inquiry>;
  }

  async findById(id: string): Promise<Inquiry | null> {
    return prisma.inquiry.findUnique({
      where: { id },
    }) as Promise<Inquiry | null>;
  }

  async update(id: string, input: UpdateInquiryInput): Promise<Inquiry> {
    return prisma.inquiry.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.subject && { subject: input.subject }),
        ...(input.proposedMarkName && { proposedMarkName: input.proposedMarkName }),
        ...(input.status && { status: input.status }),
        ...(input.ownerUserId && { ownerUserId: input.ownerUserId }),
        ...(input.metadata && { metadata: input.metadata }),
      },
    }) as Promise<Inquiry>;
  }

  async delete(id: string): Promise<void> {
    await prisma.inquiry.delete({ where: { id } });
  }

  async list(options?: ListOptions): Promise<ListResult<Inquiry>> {
    const skip = options?.skip || 0;
    const take = options?.take || 20;

    const [items, total] = await Promise.all([
      prisma.inquiry.findMany({
        skip,
        take,
        where: options?.where,
        orderBy: options?.orderBy || { createdAt: "desc" },
      }),
      prisma.inquiry.count({ where: options?.where }),
    ]);

    return {
      items: items as Inquiry[],
      total,
      skip,
      take,
    };
  }

  async findByFirmId(
    firmId: string,
    options?: ListOptions
  ): Promise<ListResult<Inquiry>> {
    return this.list({ ...options, where: { firmId } });
  }

  async findByStatus(
    firmId: string,
    status: InquiryStatus,
    options?: ListOptions
  ): Promise<ListResult<Inquiry>> {
    return this.list({
      ...options,
      where: { firmId, status },
    });
  }

  async findByOwner(
    userId: string,
    options?: ListOptions
  ): Promise<ListResult<Inquiry>> {
    return this.list({
      ...options,
      where: { ownerUserId: userId },
    });
  }

  async findRecentByFirm(firmId: string, days: number = 7): Promise<Inquiry[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return prisma.inquiry.findMany({
      where: {
        firmId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
    }) as Promise<Inquiry[]>;
  }

  async findByStatusAndUpdated(
    firmId: string,
    status: InquiryStatus,
    since: Date
  ): Promise<Inquiry[]> {
    return prisma.inquiry.findMany({
      where: {
        firmId,
        status,
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: "desc" },
    }) as Promise<Inquiry[]>;
  }
}
