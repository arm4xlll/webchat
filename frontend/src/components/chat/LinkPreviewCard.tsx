import { useState, useEffect } from 'react';
import { getLinkPreview } from '../../api/linkPreview';
import type { LinkPreviewData } from '../../types';

interface Props {
  url: string;
  isOwn: boolean;
}

const ownText = { color: 'var(--color-tg-msg-out-text)' } as const;
const ownMuted = { color: 'var(--color-tg-msg-out-text-muted)' } as const;

export default function LinkPreviewCard({ url, isOwn }: Props) {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLinkPreview(url).then(d => {
      if (!cancelled) { setData(d); setLoaded(true); }
    });
    return () => { cancelled = true; };
  }, [url]);

  if (!loaded || !data || !data.title) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 flex items-start gap-2.5 p-2.5 rounded-xl border max-w-[260px] hover:opacity-80 transition-opacity select-none cursor-pointer no-underline block
        ${isOwn ? 'bg-black/10 border-white/10' : 'bg-tg-hover border-tg-border'}`}
      onClick={e => e.stopPropagation()}
    >
      {data.imageUrl && (
        <img
          src={data.imageUrl}
          alt=""
          className="w-12 h-12 object-cover rounded-lg shrink-0"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="min-w-0 flex-1">
        {data.siteName && (
          <div className="text-[11px] text-tg-primary font-medium truncate leading-tight mb-0.5">
            {data.siteName}
          </div>
        )}
        <div
          className="text-[13px] font-semibold leading-tight line-clamp-2"
          style={isOwn ? ownText : undefined}
        >
          {data.title}
        </div>
        {data.description && (
          <div
            className="text-[12px] mt-0.5 line-clamp-2 leading-snug"
            style={isOwn ? ownMuted : { color: 'var(--color-tg-text-secondary)' }}
          >
            {data.description}
          </div>
        )}
      </div>
    </a>
  );
}
