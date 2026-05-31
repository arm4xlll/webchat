export interface User {
  id: number;
  name: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

export interface AuthResponse {
  userId: number;
  name: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  isAdmin: boolean;
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
  lastMessageContent?: string;
  lastMessageSenderName?: string;
}

export interface Message {
  id: number;
  conversationId: string;
  senderId: number;
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
  replyToId?: number;
  replyToContent?: string;
  replyToSenderName?: string;
  readAt?: string;
  reactions?: Record<string, number[]>;
  pending?: boolean;
}

export interface PinnedMessage {
  id: number;
  conversationId: string;
  messageId: number;
  content: string;
  senderName: string;
  messageSentAt: string;
  pinnedByName: string;
  pinnedForAll: boolean;
}

export interface TypingUser {
  userId: number;
  username: string;
}

export interface Session {
  id: string;
  label: string | null;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  lastActiveAt: string;
  primary: boolean;
  current: boolean;
}

export function isStickerMessage(fileUrl?: string, fileName?: string): boolean {
  return !!fileUrl && !!fileName && fileName.startsWith('sticker:');
}

export function isImageMessage(fileType?: string): boolean {
  return !!fileType && fileType.startsWith('image/');
}

export function isAudioMessage(fileType?: string): boolean {
  return !!fileType && fileType.startsWith('audio/');
}

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

export interface StickerItem {
  id: string;
  fileUrl: string;
  contentType: string;
  mediaType: 'IMAGE' | 'VIDEO';
  fileSize: number;
  emojis: string;
}

export interface StickerPack {
  id: string;
  slug: string;
  title: string;
  creatorId?: string;
  stickers: StickerItem[];
}

export function isStickerVideoType(contentType: string): boolean {
  return contentType.startsWith('video/');
}

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'active';

export interface CallIncomingEvent {
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
}

export interface CallAnsweredEvent {
  conversationId: string;
  accepted: boolean;
}

export interface CallEndedEvent {
  conversationId: string;
}

