export type InboxProvider = "gmail" | "outlook";
export type InboxAuthType = "oauth" | "app_password" | "manual";

export interface InboxCredentials {
  provider: InboxProvider;
  authType: InboxAuthType;
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  appPassword?: string;
}

export interface InboxMessage {
  id: string;
  threadId?: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: Date;
  attachments?: InboxAttachment[];
  labels?: string[];
  isUnread?: boolean;
}

export interface InboxAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  downloadUrl?: string;
}

export interface InboxFetchOptions {
  labelFilter?: string;
  lastCursor?: string;
  limit?: number;
  onlyUnread?: boolean;
}

export interface InboxFetchResult {
  messages: InboxMessage[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface IInboxPort {
  connect(credentials: InboxCredentials): Promise<void>;
  fetchMessages(options: InboxFetchOptions): Promise<InboxFetchResult>;
  markAsRead(messageId: string): Promise<void>;
  markAsProcessed(messageId: string, label: string): Promise<void>;
  isConnected(): boolean;
  refreshToken?(refreshToken: string): Promise<string>;
}

export interface InboxProvider {
  getProvider(): InboxProvider;
  getAuthType(): InboxAuthType;
  supportedAuthTypes(): InboxAuthType[];
}
