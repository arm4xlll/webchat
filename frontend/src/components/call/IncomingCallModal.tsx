import { Phone, PhoneOff } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import { useCallStore } from '../../store/callStore';
import { answerCall } from '../../api/calls';
import { useTranslation } from '../../hooks/useTranslation';

export default function IncomingCallModal() {
  const { t } = useTranslation();
  const status = useCallStore(s => s.status);
  const conversationId = useCallStore(s => s.conversationId);
  const callerName = useCallStore(s => s.callerName);
  const callerAvatar = useCallStore(s => s.callerAvatar);
  const activate = useCallStore(s => s.activate);
  const endCall = useCallStore(s => s.endCall);

  if (status !== 'incoming' || !conversationId) return null;

  const handleAccept = async () => {
    try {
      const resp = await answerCall(conversationId, true);
      if (resp) activate(resp.token, resp.wsUrl);
    } catch (e) {
      console.error('[Call] accept failed', e);
      endCall();
    }
  };

  const handleDecline = async () => {
    try {
      await answerCall(conversationId, false);
    } catch (e) {
      console.error('[Call] decline failed', e);
    } finally {
      endCall();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-tg-sidebar-bg rounded-3xl shadow-2xl px-8 py-8 flex flex-col items-center gap-5 w-[280px]">
        <UserAvatar name={callerName ?? '?'} avatarUrl={callerAvatar ?? undefined} size="xl" />

        <div className="text-center">
          <div className="font-semibold text-lg text-tg-text">{callerName}</div>
          <div className="text-sm text-tg-text-secondary mt-0.5">{t('calls.incoming')}</div>
        </div>

        <div className="flex gap-8 mt-2">
          <button
            onClick={handleDecline}
            className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-400 flex items-center justify-center transition-colors cursor-pointer"
            title={t('calls.decline')}
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={handleAccept}
            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors cursor-pointer"
            title={t('calls.accept')}
          >
            <Phone className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
