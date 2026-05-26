export interface User {
  id: string;
  name: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  userId: string;
  username: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  accessToken: string;
}

export interface Conversation {
  id: string;
  type: string;
  members: User[];
  createdAt: string;
  lastReadAt?: Record<string, string>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  editedAt?: string;
  deleted?: boolean;
  replyToId?: string;
  replyToContent?: string;
  replyToSenderName?: string;
  readAt?: string;
}

export interface Attachment {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  username: string;
  typing: boolean;
}

export interface ReadReceiptEvent {
  conversationId: string;
  readerUserId: string;
  lastReadAt: string;
}

export interface MessageEvent {
  type: 'EDITED' | 'DELETED';
  message: Message;
}

export interface PresenceEvent {
  userId: string;
  online: boolean;
  lastSeenAt?: string;
}
