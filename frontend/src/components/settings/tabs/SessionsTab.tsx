import { useEffect, useState } from 'react';
import {
  Monitor, Smartphone, Tablet, Loader2, AlertCircle,
  Pencil, Check, X, Shield, ShieldOff, Trash2, RefreshCw,
} from 'lucide-react';
import { getSessions, renameSession, revokeSession } from '../../../api/sessions';
import type { Session } from '../../../types';

// ── User-agent parser ─────────────────────────────────────────────────────

function parseUA(ua: string | null): { device: 'desktop' | 'phone' | 'tablet'; label: string } {
  if (!ua) return { device: 'desktop', label: 'Неизвестное устройство' };

  const isPhone = /Android.*Mobile|iPhone|iPod|Windows Phone/i.test(ua);
  const isTablet = !isPhone && /iPad|Android/i.test(ua);
  const device = isPhone ? 'phone' : isTablet ? 'tablet' : 'desktop';

  let browser = 'Браузер';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  let os = '';
  if (/iPhone/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) {
    const m = ua.match(/Android [0-9.]+/);
    os = m ? m[0] : 'Android';
  } else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  return { device, label: os ? `${browser} · ${os}` : browser };
}

function DeviceIcon({ device, className }: { device: 'desktop' | 'phone' | 'tablet'; className?: string }) {
  if (device === 'phone') return <Smartphone className={className} />;
  if (device === 'tablet') return <Tablet className={className} />;
  return <Monitor className={className} />;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

// ── Session card ──────────────────────────────────────────────────────────

interface CardProps {
  session: Session;
  currentIsPrimary: boolean;
  onRevoke: (id: string) => Promise<void>;
  onRename: (id: string, label: string | null) => Promise<void>;
}

function SessionCard({ session, currentIsPrimary, onRevoke, onRename }: CardProps) {
  const { device, label: deviceLabel } = parseUA(session.userAgent);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState(session.label ?? '');
  const [revoking, setRevoking] = useState(false);
  const [saving, setSaving] = useState(false);

  const canRevoke = !session.current && (!session.primary || currentIsPrimary);
  const displayName = session.label || deviceLabel;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onRename(session.id, editValue.trim() || null);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm(`Завершить сессию "${displayName}"?`)) return;
    setRevoking(true);
    try {
      await onRevoke(session.id);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div
      className={`rounded-xl border transition-colors ${
        session.current
          ? 'border-tg-primary/40 bg-tg-primary/5'
          : 'border-tg-border bg-tg-input-bg'
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Device icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: session.current
              ? 'var(--color-tg-primary)20'
              : 'var(--color-tg-hover)',
          }}
        >
          <DeviceIcon
            device={device}
            className={`w-5 h-5 ${session.current ? 'text-tg-primary' : 'text-tg-text-secondary'}`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {editMode ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                autoFocus
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setEditMode(false);
                }}
                maxLength={100}
                placeholder={deviceLabel}
                className="flex-1 min-w-0 px-2.5 py-1 bg-tg-sidebar-bg border border-tg-border rounded-lg text-tg-text text-sm focus:outline-none focus:border-tg-primary transition-colors"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg bg-tg-primary/20 text-tg-primary hover:bg-tg-primary/30 transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => { setEditMode(false); setEditValue(session.label ?? ''); }}
                className="p-1.5 rounded-lg text-tg-text-secondary hover:bg-tg-hover transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-[14px] text-tg-text truncate">{displayName}</span>
              {session.current && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-tg-primary/20 text-tg-primary whitespace-nowrap">
                  ЭТА СЕССИЯ
                </span>
              )}
              {session.primary && (
                <span title="Основная сессия">
                  <Shield className="w-3.5 h-3.5 text-tg-primary shrink-0" />
                </span>
              )}
            </div>
          )}

          {!editMode && (
            <>
              <p className="text-xs text-tg-text-secondary mt-0.5 truncate">{deviceLabel}</p>
              {session.ipAddress && (
                <p className="text-xs text-tg-text-secondary/70 mt-0.5">IP: {session.ipAddress}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[11px] text-tg-text-secondary">
                  Вход: {formatDate(session.createdAt)}
                </span>
              </div>
              <div className="text-[11px] text-tg-text-secondary/70 mt-0.5">
                Активен: {timeAgo(session.lastActiveAt)}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!editMode && (
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button
              onClick={() => { setEditMode(true); setEditValue(session.label ?? ''); }}
              title="Переименовать"
              className="p-1.5 rounded-lg text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {canRevoke && (
              <button
                onClick={handleRevoke}
                disabled={revoking}
                title="Завершить сессию"
                className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-400/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                {revoking
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </button>
            )}
            {!canRevoke && !session.current && (
              <span title="Нельзя завершить основную сессию">
                <ShieldOff className="w-3.5 h-3.5 text-tg-text-secondary/40 m-1.5" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────

export default function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentIsPrimary = sessions.find(s => s.current)?.primary ?? false;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setSessions(await getSessions());
    } catch {
      setError('Не удалось загрузить список сессий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (id: string) => {
    await revokeSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleRename = async (id: string, label: string | null) => {
    const updated = await renameSession(id, label);
    setSessions(prev => prev.map(s => s.id === id ? updated : s));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-tg-text-secondary uppercase tracking-wider">
            Активные сессии
          </h3>
          {!loading && sessions.length > 0 && (
            <p className="text-xs text-tg-text-secondary/70 mt-0.5">
              {sessions.length} {sessions.length === 1 ? 'сессия' : sessions.length < 5 ? 'сессии' : 'сессий'}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="Обновить"
          className="p-1.5 rounded-lg text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-tg-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl px-3 py-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-tg-text-secondary text-sm text-center py-8">Нет активных сессий</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              currentIsPrimary={currentIsPrimary}
              onRevoke={handleRevoke}
              onRename={handleRename}
            />
          ))}
        </div>
      )}

      <div className="rounded-xl bg-tg-input-bg border border-tg-border p-3 text-xs text-tg-text-secondary space-y-1">
        <p className="font-medium text-tg-text">Об управлении сессиями</p>
        <p>Первая сессия (основная) защищена от удаления другими сессиями.</p>
        <p>Завершить текущую сессию можно только через кнопку «Выйти».</p>
      </div>
    </div>
  );
}
