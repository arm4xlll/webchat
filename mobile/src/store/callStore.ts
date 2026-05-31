import { create } from 'zustand';
import type { CallStatus, CallIncomingEvent } from '../types';

interface CallState {
  status: CallStatus;
  conversationId: string | null;
  callerId: string | null;
  callerName: string | null;
  callerAvatar: string | null;
  token: string | null;
  wsUrl: string | null;

  setCalling: (conversationId: string) => void;
  setCallerToken: (token: string, wsUrl: string) => void;
  setIncoming: (ev: CallIncomingEvent) => void;
  activate: (token: string, wsUrl: string) => void;
  endCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  status: 'idle',
  conversationId: null,
  callerId: null,
  callerName: null,
  callerAvatar: null,
  token: null,
  wsUrl: null,

  setCalling: (conversationId) =>
    set({ status: 'calling', conversationId, token: null, wsUrl: null }),

  setCallerToken: (token, wsUrl) =>
    set({ token, wsUrl }),

  setIncoming: (ev) =>
    set({
      status: 'incoming',
      conversationId: ev.conversationId,
      callerId: ev.callerId,
      callerName: ev.callerName,
      callerAvatar: ev.callerAvatar ?? null,
      token: null,
      wsUrl: null,
    }),

  activate: (token, wsUrl) =>
    set({ status: 'active', token, wsUrl }),

  endCall: () =>
    set({
      status: 'idle',
      conversationId: null,
      callerId: null,
      callerName: null,
      callerAvatar: null,
      token: null,
      wsUrl: null,
    }),
}));
