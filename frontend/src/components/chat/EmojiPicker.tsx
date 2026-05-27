import { useEffect, useRef } from 'react';

const EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🔥', '🎉', '💯', '👎', '😍', '🤔',
  '✅', '💪', '🙏', '👏', '😎', '🥰',
];

interface Props {
  x: number;
  y: number;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ x, y, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Adjust position to stay within viewport
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const pickerW = 240;
  const pickerH = 120;
  const adjustedX = Math.min(x, viewportW - pickerW - 8);
  const adjustedY = y + pickerH > viewportH ? y - pickerH - 8 : y + 8;

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-tg-sidebar-bg border border-tg-border rounded-2xl shadow-2xl p-2"
      style={{ left: adjustedX, top: adjustedY, width: pickerW }}
    >
      <div className="grid grid-cols-6 gap-0.5">
        {EMOJIS.map(e => (
          <button
            key={e}
            onMouseDown={(ev) => { ev.preventDefault(); onSelect(e); onClose(); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-tg-hover transition-colors text-xl cursor-pointer select-none"
            title={e}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
