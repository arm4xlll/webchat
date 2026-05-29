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

type Section = 'system' | 'http' | 'business' | 'errors' | 'users';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'system',   label: 'Система',     icon: <Server className="w-4 h-4" /> },
  { id: 'http',     label: 'HTTP',        icon: <Activity className="w-4 h-4" /> },
  { id: 'business', label: 'Аналитика',   icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'errors',   label: 'Ошибки',      icon: <AlertCircle className="w-4 h-4" /> },
  { id: 'users',    label: 'Администраторы', icon: <Users className="w-4 h-4" /> },
];

const RANGE_MS: Record<TimeRange, number> = {
  '1h':  3_600_000,
  '24h': 86_400_000,
  '7d':  604_800_000,
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { latest, history, connected } = useAdminMetricsSSE();
  const [section, setSection] = useState<Section>('system');
  const [range, setRange]     = useState<TimeRange>('1h');

  const now = Date.now();
  const filtered = history.filter(s => now - s.timestamp <= RANGE_MS[range]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-white/10 bg-gray-900 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-tg-primary" />
          <span className="font-bold text-white tracking-tight">WebChat Admin</span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {/* Live indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-medium ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>
            {connected
              ? <><Wifi className="w-3.5 h-3.5" /><span>Live</span></>
              : <><WifiOff className="w-3.5 h-3.5" /><span>Переподключение...</span></>
            }
          </div>

          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 border-r border-white/10 bg-gray-900 py-3">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                section === item.id
                  ? 'bg-tg-primary/15 text-tg-primary border-r-2 border-tg-primary'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={section === item.id ? 'text-tg-primary' : 'text-gray-500'}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Section title */}
          <h2 className="text-lg font-bold text-white mb-5">
            {NAV.find(n => n.id === section)?.label}
          </h2>

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
