'use server';

import { getRepositoryContainer } from '@ip-review/db';
import type { CreateInquiryInput, Inquiry } from '@ip-review/domain';
import { revalidatePath } from 'next/cache';

export async function createInquiryAction(
  input: CreateInquiryInput
): Promise<{ success: true; inquiry: Inquiry } | { success: false; error: string }> {
  try {
    const repositories = getRepositoryContainer();
    const inquiry = await repositories.inquiries.create(input);
    revalidatePath('/inquiries');
    return { success: true, inquiry };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create inquiry',
    };
  }
}

export async function updateInquiryStatusAction(
  id: string,
  status: Inquiry['status']
): Promise<{ success: true; inquiry: Inquiry } | { success: false; error: string }> {
  try {
    const repositories = getRepositoryContainer();
    const inquiry = await repositories.inquiries.update(id, { status });
    revalidatePath(`/inquiries/${id}`);
    revalidatePath('/inquiries');
    return { success: true, inquiry };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update inquiry status',
    };
  }
}

export async function assignInquiryAction(
  id: string,
  userId: string
): Promise<{ success: true; inquiry: Inquiry } | { success: false; error: string }> {
  try {
    const repositories = getRepositoryContainer();
    const inquiry = await repositories.inquiries.update(id, { ownerUserId: userId });
    revalidatePath(`/inquiries/${id}`);
    return { success: true, inquiry };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign inquiry',
    };
  }
}
