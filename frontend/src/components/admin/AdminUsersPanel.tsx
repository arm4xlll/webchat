import { useEffect, useState } from 'react';
import { Shield, ShieldOff, Search, Crown } from 'lucide-react';
import { listAdmins, searchUsers, grantAdmin, revokeAdmin } from '../../api/admin';
import type { AdminUser } from '../../types/admin';
import UserAvatar from '../common/UserAvatar';

export default function AdminUsersPanel() {
  const [admins, setAdmins]       = useState<AdminUser[]>([]);
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);

  const loadAdmins = async () => {
    const data = await listAdmins();
    setAdmins(data);
  };

  useEffect(() => { loadAdmins(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchUsers(query.trim());
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const handleGrant = async (id: string) => {
    await grantAdmin(id);
    await loadAdmins();
    setResults(prev => prev.map(u => u.id === id ? { ...u, isAdmin: true } : u));
  };

  const handleRevoke = async (id: string) => {
    await revokeAdmin(id);
    await loadAdmins();
    setResults(prev => prev.map(u => u.id === id ? { ...u, isAdmin: false } : u));
  };

  const renderUser = (user: AdminUser, showRevoke = false) => (
    <div key={user.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
      <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-200 truncate">{user.name}</span>
          {user.isRoot && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
        </div>
        <span className="text-xs text-gray-500">@{user.username}</span>
      </div>
      {user.isRoot ? (
        <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 bg-amber-400/10 rounded">ROOT</span>
      ) : showRevoke ? (
        <button
          onClick={() => handleRevoke(user.id)}
          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Снять права"
        >
          <ShieldOff className="w-4 h-4" />
        </button>
      ) : !user.isAdmin ? (
        <button
          onClick={() => handleGrant(user.id)}
          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
          title="Выдать права"
        >
          <Shield className="w-4 h-4" />
        </button>
      ) : (
        <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-400/10 rounded">ADMIN</span>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Current admins */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          Текущие администраторы
        </p>
        <div className="space-y-0.5">
          {admins.length === 0
            ? <p className="text-sm text-gray-500 py-4 text-center">Нет администраторов</p>
            : admins.map(u => renderUser(u, true))}
        </div>
      </div>

      {/* Search and grant */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider flex items-center gap-2">
          <Search className="w-3.5 h-3.5" />
          Поиск пользователей
        </p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Имя или @username..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-tg-primary transition-colors"
          />
        </div>
        <div className="space-y-0.5">
          {searching && <p className="text-xs text-gray-500 text-center py-2">Поиск...</p>}
          {!searching && results.length === 0 && query.trim() && (
            <p className="text-xs text-gray-500 text-center py-2">Не найдено</p>
          )}
          {results.map(u => renderUser(u, false))}
        </div>
      </div>
    </div>
  );
}
