import { useEffect, useState } from 'react';
import {
  Monitor, Smartphone, Tablet, Loader2, AlertCircle,
  Pencil, Check, X, Shield, ShieldOff, Trash2, RefreshCw,
} from 'lucide-react';
import { getSessions, renameSession, revokeSession } from '../../../api/sessions';
import type { Session } from '../../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslation } from '../../../hooks/useTranslation';

function parseUA(ua: string | null, t: any): { device: 'desktop' | 'phone' | 'tablet'; label: string } {
  if (!ua) return { device: 'desktop', label: t('settings.sessions.unknownDevice') };
  const isPhone = /Android.*Mobile|iPhone|iPod|Windows Phone/i.test(ua);
  const isTablet = !isPhone && /iPad|Android/i.test(ua);
  const device = isPhone ? 'phone' : isTablet ? 'tablet' : 'desktop';
  let browser = t('settings.sessions.browser');
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  let os = '';
  if (/iPhone/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) { const m = ua.match(/Android [0-9.]+/); os = m ? m[0] : 'Android'; }
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  return { device, label: os ? `${browser} · ${os}` : browser };
}

function DeviceIcon({ device, className }: { device: 'desktop' | 'phone' | 'tablet'; className?: string }) {
  if (device === 'phone') return <Smartphone className={className} />;
  if (device === 'tablet') return <Tablet className={className} />;
  return <Monitor className={className} />;
}

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(iso: string, t: any): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return t('settings.sessions.timeJustNow');
  if (diff < 3600) return t('settings.sessions.timeMinAgo', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('settings.sessions.timeHourAgo', { count: Math.floor(diff / 3600) });
  return t('settings.sessions.timeDayAgo', { count: Math.floor(diff / 86400) });
}

interface CardProps {
  session: Session;
  currentIsPrimary: boolean;
  onRevoke: (id: string) => Promise<void>;
  onRename: (id: string, label: string | null) => Promise<void>;
}

function SessionCard({ session, currentIsPrimary, onRevoke, onRename }: CardProps) {
  const { t, language } = useTranslation();
  const { device, label: deviceLabel } = parseUA(session.userAgent, t);
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
    if (!window.confirm(t('settings.sessions.terminateConfirm', { name: displayName }))) return;
    setRevoking(true);
    try { await onRevoke(session.id); } finally { setRevoking(false); }
  };

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      session.current ? 'border-primary/40 bg-primary/5' : 'border-border bg-input',
    )}>
      <div className="flex items-start gap-3 p-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          session.current ? 'bg-primary/20' : 'bg-secondary',
        )}>
          <DeviceIcon device={device} className={cn('w-5 h-5', session.current ? 'text-primary' : 'text-muted-foreground')} />
        </div>

        <div className="flex-1 min-w-0">
          {editMode ? (
            <div className="flex items-center gap-2 mb-1">
              <Label className="sr-only">{t('settings.sessions.renamePlaceholder')}</Label>
              <Input
                autoFocus
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setEditMode(false);
                }}
                maxLength={100}
                placeholder={deviceLabel}
                className="h-8 text-sm"
              />
              <Button size="icon" variant="ghost" onClick={handleSave} disabled={saving} className="h-8 w-8 shrink-0">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setEditMode(false); setEditValue(session.label ?? ''); }} className="h-8 w-8 shrink-0">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-[14px] text-foreground truncate">{displayName}</span>
              {session.current && (
                <Badge variant="default" className="text-[10px] py-0 h-4">{t('settings.sessions.thisSession')}</Badge>
              )}
              {session.primary && (
                <span title={t('settings.sessions.primarySession')}>
                  <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                </span>
              )}
            </div>
          )}

          {!editMode && (
            <>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{deviceLabel}</p>
              {session.ipAddress && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">IP: {session.ipAddress}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1.5">{t('settings.sessions.started', { time: formatDate(session.createdAt, language) })}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{t('settings.sessions.active', { time: timeAgo(session.lastActiveAt, t) })}</p>
            </>
          )}
        </div>

        {!editMode && (
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <Button
              size="icon" variant="ghost"
              onClick={() => { setEditMode(true); setEditValue(session.label ?? ''); }}
              title={t('settings.sessions.renameTooltip')}
              className="h-8 w-8"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            {canRevoke ? (
              <Button
                size="icon" variant="ghost"
                onClick={handleRevoke}
                disabled={revoking}
                title={t('settings.sessions.terminateTooltip')}
                className="h-8 w-8 text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
              >
                {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </Button>
            ) : !session.current && (
              <span title={t('settings.sessions.primaryRevokeBlocked')} className="m-1.5">
                <ShieldOff className="w-3.5 h-3.5 text-muted-foreground/40" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SessionsTab() {
  const { t, plural } = useTranslation();
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
      setError(t('settings.sessions.loadError'));
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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('settings.sessionsSection')}
          </h3>
          {!loading && sessions.length > 0 && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {sessions.length} {plural(sessions.length, {
                ru: ['сессия', 'сессии', 'сессий'],
                en: ['session', 'sessions']
              })}
            </p>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={load} disabled={loading} title={t('settings.sessions.refresh')} className="h-8 w-8">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-red-400 rounded-xl px-3 py-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">{t('settings.sessions.noSessions')}</p>
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

      <div className="rounded-xl bg-secondary border border-border p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">{t('settings.sessions.infoTitle')}</p>
        <p>{t('settings.sessions.infoLine1')}</p>
        <p>{t('settings.sessions.infoLine2')}</p>
      </div>
    </div>
  );
}
