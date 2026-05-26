export interface User {
  id: string;
  name: string;
  username: string;
}

export interface AuthResponse {
  userId: string;
  username: string;
  name: string;
  accessToken: string;
}

export interface Conversation {
  id: string;
  type: string;
  members: User[];
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  content: string;
  createdAt: string;
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
