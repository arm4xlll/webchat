import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Server, BarChart2, AlertCircle, Users,
  ArrowLeft, Wifi, WifiOff,
} from 'lucide-react';
import { useAdminMetricsSSE } from '../hooks/useAdminMetricsSSE';
import TimeRangeSelector, { type TimeRange } from '../components/admin/TimeRangeSelector';
import SystemHealthPanel from '../components/admin/SystemHealthPanel';
import HttpMetricsPanel from '../components/admin/HttpMetricsPanel';
import BusinessMetricsPanel from '../components/admin/BusinessMetricsPanel';
import ErrorLogPanel from '../components/admin/ErrorLogPanel';
import AdminUsersPanel from '../components/admin/AdminUsersPanel';
import { useTranslation } from '../hooks/useTranslation';

type Section = 'system' | 'http' | 'business' | 'errors' | 'users';

interface NavItem {
  id: Section;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { id: 'system',   icon: <Server className="w-4 h-4" /> },
  { id: 'http',     icon: <Activity className="w-4 h-4" /> },
  { id: 'business', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'errors',   icon: <AlertCircle className="w-4 h-4" /> },
  { id: 'users',    icon: <Users className="w-4 h-4" /> },
];

const RANGE_MS: Record<TimeRange, number> = {
  '1h':  3_600_000,
  '24h': 86_400_000,
  '7d':  604_800_000,
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { latest, history, connected } = useAdminMetricsSSE();
  const [section, setSection] = useState<Section>('system');
  const [range, setRange]     = useState<TimeRange>('1h');

  const now = Date.now();
  const filtered = history.filter(s => now - s.timestamp <= RANGE_MS[range]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-gray-900 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-sm font-medium"
          title={t('admin.backTooltip')}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('admin.back')}</span>
        </button>

        <div className="flex items-center gap-2 border-l border-white/10 pl-3">
          <Server className="w-4 h-4 text-tg-primary shrink-0" />
          <span className="font-bold text-white tracking-tight text-sm">{t('admin.title')}</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            connected ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
          }`}>
            {connected
              ? <><Wifi className="w-3 h-3" /><span>{t('admin.live')}</span></>
              : <><WifiOff className="w-3 h-3" /><span>{t('admin.reconnecting')}</span></>
            }
          </div>

          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-52 shrink-0 border-r border-white/10 bg-gray-900 py-3 px-2">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('admin.sections.label')}</p>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors cursor-pointer rounded-lg ${
                section === item.id
                  ? 'bg-tg-primary/15 text-tg-primary'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={section === item.id ? 'text-tg-primary shrink-0' : 'text-gray-500 shrink-0'}>
                {item.icon}
              </span>
              <span className="font-medium">{t(`admin.sections.${item.id}`)}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-gray-500">
              {NAV.find(n => n.id === section)?.icon}
            </span>
            <h2 className="text-lg font-bold text-white">
              {t(`admin.sections.${section}`)}
            </h2>
          </div>

          {section === 'system'   && <SystemHealthPanel   latest={latest} history={filtered} />}
          {section === 'http'     && <HttpMetricsPanel     latest={latest} history={filtered} />}
          {section === 'business' && <BusinessMetricsPanel latest={latest} history={filtered} />}
          {section === 'errors'   && (
            <div className="h-[calc(100vh-180px)]">
              <ErrorLogPanel />
            </div>
          )}
          {section === 'users' && <AdminUsersPanel />}
        </main>
      </div>
    </div>
  );
}
