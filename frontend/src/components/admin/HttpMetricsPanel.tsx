import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';
import { Zap, Timer, AlertTriangle } from 'lucide-react';
import MetricCard from './MetricCard';
import type { AdminMetricsSnapshot } from '../../types/admin';

interface Props {
  latest: AdminMetricsSnapshot | null;
  history: AdminMetricsSnapshot[];
}

function latencyData(history: AdminMetricsSnapshot[]) {
  return history.map(s => ({
    t: new Date(s.timestamp).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
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
  const h = latest?.http;
  const lData = latencyData(history);
  const sData = statusData(latest);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="RPS"
          value={h ? h.rps.toFixed(2) : '—'}
          sub="запросов / сек"
          accent="green"
          icon={<Zap className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label="Латентность p50"
          value={h ? `${h.p50Ms} мс` : '—'}
          sub={`p95: ${h?.p95Ms ?? '—'} мс`}
          accent="blue"
          icon={<Timer className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label="Латентность p99"
          value={h ? `${h.p99Ms} мс` : '—'}
          sub="99-й перцентиль"
          accent={h && h.p99Ms > 500 ? 'red' : 'yellow'}
          icon={<Timer className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label="Ошибки 5xx"
          value={h?.count5xx ?? '—'}
          sub={`4xx: ${h?.count4xx ?? '—'}`}
          accent={h && h.count5xx > 0 ? 'red' : 'green'}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Latency chart */}
        {lData.length > 1 && (
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Латентность (мс)</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={lData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#6b7280' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} unit=" мс" />
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
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Статус-коды (период)</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={sData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" name="Запросов" radius={[0, 4, 4, 0]}>
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
