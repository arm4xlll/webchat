import { useId } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  readAt: string | undefined;
  pending?: boolean;
}

export default function MessageStatus({ readAt, pending }: Props) {
  const uid = useId();
  const gradId = `hg-${uid.replace(/:/g, '')}`;
  const isRead = readAt != null;

  if (pending) {
    return (
      <span className="inline-flex items-center shrink-0" title="Отправляется...">
        <Clock className="w-[11px] h-[11px]" style={{ color: 'var(--color-tg-msg-out-text-muted)', opacity: 0.7 }} />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center shrink-0" title={isRead ? 'Прочитано' : 'Отправлено'}>
      <svg width="15" height="13" viewBox="0 0 16 14" fill="none">
        <defs>
          {/* Half-fill gradient for "sent" state: left 52% filled, rest transparent */}
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="52%" stopColor="var(--color-tg-msg-out-text-muted)" />
            <stop offset="52%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path
          d="M8 12.8C8 12.8 1 8.2 1 4.2C1 2.2 2.6 1 4.5 1C5.9 1 7.1 1.85 8 3C8.9 1.85 10.1 1 11.5 1C13.4 1 15 2.2 15 4.2C15 8.2 8 12.8 8 12.8Z"
          fill={isRead
            ? 'var(--color-tg-primary)'
            : `url(#${gradId})`}
          stroke={isRead
            ? 'var(--color-tg-primary)'
            : 'var(--color-tg-msg-out-text-muted)'}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
