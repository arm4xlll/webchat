export interface User {
  id: string;
  name: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  /** JSON string: {"themeId":"pink","fontSize":"medium"} */
  settings?: string;
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
  lastMessageAt?: string;
  unreadCount?: number;
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
  /** emoji → list of userIds who reacted */
  reactions?: Record<string, string[]>;
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

export interface PresenceEvent {
  userId: string;
  online: boolean;
  lastSeenAt?: string;
}

export interface Session {
  id: string;
  label: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  primary: boolean;
  current: boolean;
}
