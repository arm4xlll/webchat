import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';
import { Zap, Timer, AlertTriangle } from 'lucide-react';
import MetricCard from './MetricCard';
import type { AdminMetricsSnapshot } from '../../types/admin';
import { useTranslation } from '../../hooks/useTranslation';

interface Props {
  latest: AdminMetricsSnapshot | null;
  history: AdminMetricsSnapshot[];
}

function latencyData(history: AdminMetricsSnapshot[], language: string) {
  return history.map(s => ({
    t: new Date(s.timestamp).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }),
    p50: s.http.p50Ms,
    p95: s.http.p95Ms,
    p99: s.http.p99Ms,
  }));
}

function statusData(latest: AdminMetricsSnapshot | null) {
  if (!latest) return [];
  const h = latest.http;
  return [
    { name: '2xx', value: h.count2xx, fill: '#34d399' },
    { name: '4xx', value: h.count4xx, fill: '#fbbf24' },
    { name: '5xx', value: h.count5xx, fill: '#f87171' },
  ];
}

export default function HttpMetricsPanel({ latest, history }: Props) {
  const { t, language } = useTranslation();
  const h = latest?.http;
  const lData = latencyData(history, language);
  const sData = statusData(latest);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="RPS"
          value={h ? h.rps.toFixed(2) : '—'}
          sub={t('admin.http.rps')}
          accent="green"
          icon={<Zap className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label={t('admin.http.p50')}
          value={h ? `${h.p50Ms} ${t('admin.http.latencyUnit').trim()}` : '—'}
          sub={t('admin.http.p95', { ms: h?.p95Ms ?? '—' })}
          accent="blue"
          icon={<Timer className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label={t('admin.http.p99')}
          value={h ? `${h.p99Ms} ${t('admin.http.latencyUnit').trim()}` : '—'}
          sub={t('admin.http.p99Desc')}
          accent={h && h.p99Ms > 500 ? 'red' : 'yellow'}
          icon={<Timer className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label={t('admin.http.errors5xx')}
          value={h?.count5xx ?? '—'}
          sub={t('admin.http.errors4xx', { count: h?.count4xx ?? '—' })}
          accent={h && h.count5xx > 0 ? 'red' : 'green'}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Latency chart */}
        {lData.length > 1 && (
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">{t('admin.http.latencyChart')}</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={lData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#6b7280' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} unit={t('admin.http.latencyUnit')} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="p50" name="p50" stroke="#34d399" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="p95" name="p95" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="p99" name="p99" stroke="#f87171" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status codes */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">{t('admin.http.statusCodes')}</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={sData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" name={t('admin.http.requestsName')} radius={[0, 4, 4, 0]}>
                {sData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
