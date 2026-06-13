import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Loader2 } from 'lucide-react';
import { useCallStore } from '../../store/callStore';
import { useCall } from '../../hooks/useCall';
import { useTranslation } from '../../hooks/useTranslation';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ActiveCallBar() {
  const { t } = useTranslation();
  const status = useCallStore(s => s.status);
  const { isMuted, toggleMute, remoteCount, handleEnd } = useCall();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'active') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  if (status !== 'calling' && status !== 'active') return null;

  const isCalling = status === 'calling';

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-green-500/15 shrink-0 border-b border-green-500/20">
      <div className="flex items-center gap-2 min-w-0">
        {isCalling ? (
          <Loader2 className="w-4 h-4 text-green-400 animate-spin shrink-0" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
        )}
        <span className="text-sm text-tg-text truncate">
          {isCalling
            ? t('calls.calling')
            : remoteCount > 0
              ? formatDuration(elapsed)
              : t('calls.waitingForPeer')}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {status === 'active' && (
          <button
            onClick={toggleMute}
            title={isMuted ? t('calls.unmuteMic') : t('calls.muteMic')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                : 'bg-tg-hover text-tg-text-secondary hover:text-tg-text'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}

        <button
          onClick={handleEnd}
          title={t('calls.endCall')}
          className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-400 flex items-center justify-center transition-colors cursor-pointer"
        >
          <PhoneOff className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
