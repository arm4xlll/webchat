import api from './client';

interface CallTokenResponse {
  token: string;
  wsUrl: string;
  conversationId: string;
}

export async function inviteCall(conversationId: string): Promise<CallTokenResponse> {
  const res = await api.post<CallTokenResponse>('/calls/invite', { conversationId });
  return res.data;
}

export async function answerCall(conversationId: string, accepted: boolean): Promise<CallTokenResponse | null> {
  const res = await api.post<CallTokenResponse | null>('/calls/answer', { conversationId, accepted });
  return res.data ?? null;
}

export async function endCall(conversationId: string): Promise<void> {
  await api.post('/calls/end', { conversationId });
}
