export type InquiryStatus =
  | "new"
  | "parsed"
  | "candidate_ready"
  | "searched"
  | "reviewed"
  | "approved"
  | "exported";

export type InquirySourceChannel = "manual" | "gmail_forward" | "gmail_api";

export interface Inquiry {
  id: string;
  firmId: string;
  clientId?: string;
  inboxAccountId?: string;
  ownerUserId?: string;
  classificationVersionId?: string;
  sourceChannel: InquirySourceChannel;
  title: string;
  subject?: string;
  rawText: string;
  rawHtml?: string;
  senderEmail?: string;
  proposedMarkName?: string;
  metadata?: Record<string, any>;
  status: InquiryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInquiryInput {
  firmId: string;
  clientId?: string;
  inboxAccountId?: string;
  ownerUserId?: string;
  sourceChannel?: InquirySourceChannel;
  title: string;
  subject?: string;
  rawText: string;
  rawHtml?: string;
  senderEmail?: string;
  proposedMarkName?: string;
  metadata?: Record<string, any>;
}

export interface UpdateInquiryInput {
  title?: string;
  subject?: string;
  proposedMarkName?: string;
  status?: InquiryStatus;
  ownerUserId?: string;
  metadata?: Record<string, any>;
}

export interface InquiryStatusTransition {
  fromStatus: InquiryStatus;
  toStatus: InquiryStatus;
  timestamp: Date;
  triggeredBy: string;
  details?: Record<string, any>;
}
