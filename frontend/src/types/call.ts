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
