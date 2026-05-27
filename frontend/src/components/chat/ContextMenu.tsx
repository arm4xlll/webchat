import { useEffect, useLayoutEffect, useRef } from 'react';

export interface ContextMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  info?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw - 8) el.style.left = `${x - rect.width}px`;
    if (rect.bottom > vh - 8) el.style.top = `${y - rect.height}px`;
  }, [x, y]);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: x, top: y, zIndex: 1000 }}
      className="bg-tg-sidebar-bg border border-tg-border rounded-xl shadow-2xl py-1 min-w-[172px] overflow-hidden select-none"
    >
      {items.map((item, i) => (
        item.info ? (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-2 text-[13px] text-tg-text-secondary border-t border-tg-border/50 mt-1 pt-2 select-none"
          >
            <span className="shrink-0 opacity-60">{item.icon}</span>
            {item.label}
          </div>
        ) : (
          <button
            key={i}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-[14px] transition-colors cursor-pointer ${
              item.danger
                ? 'text-rose-400 hover:bg-rose-500/10'
                : 'text-tg-text hover:bg-tg-hover'
            }`}
          >
            <span className="shrink-0">{item.icon}</span>
            {item.label}
          </button>
        )
      ))}
    </div>
  );
}
