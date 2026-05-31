import { useId } from 'react';
import { HeartCrack } from 'lucide-react';

interface Props {
  readAt: string | undefined;
  pending?: boolean;
  failed?: boolean;
}

const HEART_PATH =
  'M8 12.8C8 12.8 1 8.2 1 4.2C1 2.2 2.6 1 4.5 1C5.9 1 7.1 1.85 8 3C8.9 1.85 10.1 1 11.5 1C13.4 1 15 2.2 15 4.2C15 8.2 8 12.8 8 12.8Z';

export default function MessageStatus({ readAt, pending, failed }: Props) {
  const uid = useId();
  const gradId = `hg-${uid.replace(/:/g, '')}`;
  const isRead = readAt != null;

  // One of: failed | pending | read | sent. Keying the inner icon on this lets
  // it crossfade smoothly when the state changes (e.g. pending → sent) without
  // remounting — and never shifts the time text thanks to the fixed width.
  const state = failed ? 'failed' : pending ? 'pending' : isRead ? 'read' : 'sent';

  const title = failed ? 'Не отправлено'
    : pending ? 'Отправляется...'
    : isRead ? 'Прочитано'
    : 'Отправлено';

  return (
    <span className="inline-flex items-center justify-center shrink-0 w-[15px] h-[13px]" title={title}>
      <span key={state} className="inline-flex items-center justify-center animate-status-pop">
        {state === 'failed' ? (
          <HeartCrack className="w-[13px] h-[13px] text-rose-400" />
        ) : state === 'pending' ? (
          // Hollow heart, gently beating while the message is on its way.
          <svg width="15" height="13" viewBox="0 0 16 14" fill="none" className="animate-heartbeat">
            <path
              d={HEART_PATH}
              fill="none"
              stroke="var(--color-tg-msg-out-text-muted)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          </svg>
        ) : (
          // Half-filled = sent, fully filled (primary) = read.
          <svg width="15" height="13" viewBox="0 0 16 14" fill="none">
            <defs>
              <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
                <stop offset="52%" stopColor="var(--color-tg-msg-out-text-muted)" />
                <stop offset="52%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d={HEART_PATH}
              fill={isRead ? 'var(--color-tg-primary)' : `url(#${gradId})`}
              stroke={isRead ? 'var(--color-tg-primary)' : 'var(--color-tg-msg-out-text-muted)'}
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </span>
  );
}
