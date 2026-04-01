import { getRepositoryContainer } from '@ip-review/db';
import type { Inquiry, ListOptions, ListResult } from '@ip-review/domain';

export async function getInquiriesByFirm(
  firmId: string,
  options?: ListOptions
): Promise<ListResult<Inquiry>> {
  const repositories = getRepositoryContainer();
  return repositories.inquiries.findByFirmId(firmId, options);
}

export async function getInquiriesByStatus(
  firmId: string,
  status: string,
  options?: ListOptions
): Promise<ListResult<Inquiry>> {
  const repositories = getRepositoryContainer();
  return repositories.inquiries.findByStatus(firmId, status, options);
}

export async function getInquiryById(id: string): Promise<Inquiry | null> {
  const repositories = getRepositoryContainer();
  return repositories.inquiries.findById(id);
}

export async function getRecentInquiries(
  firmId: string,
  days = 7
): Promise<Inquiry[]> {
  const repositories = getRepositoryContainer();
  return repositories.inquiries.findRecentByFirm(firmId, days);
}
