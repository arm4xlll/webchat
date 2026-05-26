import { useState, useCallback, useRef } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSend: (content: string) => void;
  onTyping: (typing: boolean) => void;
}

export default function MessageInput({ onSend, onTyping }: Props) {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, 2500);
  };

  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!content) return;
    onSend(content);
    setText('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    onTyping(false);
  }, [text, onSend, onTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = text.trim().length > 0;

  return (
    <div className="px-4 py-3 bg-tg-sidebar-bg border-t border-tg-border flex items-center gap-3 select-none">
      <textarea
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Напишите сообщение..."
        rows={1}
        className="flex-1 bg-tg-input-bg rounded-2xl px-4 py-2.5 text-tg-text placeholder:text-tg-text-secondary text-[15px] resize-none outline-none max-h-28 overflow-y-auto transition-all duration-200 leading-[1.4] border border-tg-border focus:border-tg-primary"
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        title="Отправить (Enter)"
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
          canSend
            ? 'bg-tg-primary text-white hover:opacity-90 cursor-pointer'
            : 'bg-tg-input-bg text-tg-text-secondary cursor-not-allowed opacity-50'
        }`}
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}

