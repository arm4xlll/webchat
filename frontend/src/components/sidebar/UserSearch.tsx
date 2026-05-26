import { useState, useCallback, useRef } from 'react';
import { searchUsers } from '../../api/users';
import { createConversation } from '../../api/conversations';
import { useChatStore } from '../../store/chatStore';
import type { User } from '../../types';
import { Search, Loader2 } from 'lucide-react';

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addConversation, setActiveConversation } = useChatStore();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const users = await searchUsers(q);
      setResults(users);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(val), 300);
  };

  const openChat = async (e: React.MouseEvent, user: User) => {
    e.preventDefault();
    try {
      const conv = await createConversation(user.id);
      addConversation(conv);
      setActiveConversation(conv.id);
      setQuery('');
      setResults([]);
      setFocused(false);
    } catch (err) {
      console.error('Failed to open chat', err);
    }
  };

  const showDropdown = focused && (results.length > 0 || (loading && query.trim().length > 0));

  return (
    <div className="p-4 pb-2 relative z-50">
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-tg-text-secondary">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-tg-primary" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </span>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Поиск..."
          className="w-full pl-9 pr-4 py-2 bg-tg-input-bg border border-tg-border focus:border-tg-primary rounded-full text-tg-text placeholder:text-tg-text-secondary text-sm focus:outline-none transition-all duration-200"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-3 right-3 top-full mt-1.5 bg-tg-sidebar-bg border border-tg-border rounded-xl shadow-2xl overflow-hidden animate-slide-in">
          {loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-tg-text-secondary text-center flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-tg-primary" />
              <span>Поиск...</span>
            </div>
          )}
          {results.map(user => (
            <div
              key={user.id}
              onMouseDown={e => openChat(e, user)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-tg-hover cursor-pointer transition-colors duration-150"
            >
              <div className="w-10 h-10 rounded-full bg-tg-primary text-white flex items-center justify-center font-medium text-base shrink-0">
                {user.name[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-tg-text truncate">{user.name}</div>
                <div className="text-xs text-tg-text-secondary truncate">@{user.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

