import { useChatStore } from '../../store/chatStore';

interface Props {
  conversationId: string;
}

const EMPTY_TYPING: never[] = [];

export default function TypingIndicator({ conversationId }: Props) {
  const typingUsers = useChatStore(s => s.typingUsers[conversationId] ?? EMPTY_TYPING);

  if (typingUsers.length === 0) return <div style={{ height: 22 }} />;

  const names = typingUsers.map(u => u.username).join(', ');
  const label = typingUsers.length === 1 ? `${names} печатает` : `${names} печатают`;

  return (
    <div className="flex items-center gap-2 h-[26px] px-6 text-[13px] text-tg-primary bg-transparent select-none animate-slide-in">
      <span className="flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1 h-1 rounded-full bg-tg-primary inline-block" style={{
            animation: 'bounce 1.2s infinite',
            animationDelay: `${i * 0.2}s`
          }} />
        ))}
      </span>
      <span>{label}...</span>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
