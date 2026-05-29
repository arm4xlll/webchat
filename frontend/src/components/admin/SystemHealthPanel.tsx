import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Cpu, HardDrive, Wifi, Clock } from 'lucide-react';
import MetricCard from './MetricCard';
import type { AdminMetricsSnapshot } from '../../types/admin';

interface Props {
  latest: AdminMetricsSnapshot | null;
  history: AdminMetricsSnapshot[];
}

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}ч ${m}м`;
}

function chartData(history: AdminMetricsSnapshot[]) {
  return history.map(s => ({
    t: new Date(s.timestamp).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
    cpu: +s.system.cpuProcessPercent.toFixed(1),
    ram: Math.round((s.system.heapUsedMb / s.system.heapMaxMb) * 100),
  }));
}

export default function SystemHealthPanel({ latest, history }: Props) {
  const s = latest?.system;
  const data = chartData(history);

  const heapPct = s ? Math.round((s.heapUsedMb / s.heapMaxMb) * 100) : 0;
  const ramPct  = s ? Math.round(((s.totalPhysicalMemoryMb - s.freePhysicalMemoryMb) / s.totalPhysicalMemoryMb) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="CPU процесса"
          value={s ? `${s.cpuProcessPercent.toFixed(1)}%` : '—'}
          sub={`Система: ${s ? s.cpuSystemPercent.toFixed(1) : '—'}%`}
          accent={s && s.cpuProcessPercent > 70 ? 'red' : 'green'}
          icon={<Cpu className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label="Heap JVM"
          value={s ? `${heapPct}%` : '—'}
          sub={s ? `${s.heapUsedMb} / ${s.heapMaxMb} МБ` : ''}
          accent={heapPct > 80 ? 'red' : heapPct > 60 ? 'yellow' : 'blue'}
          icon={<HardDrive className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label="RAM системы"
          value={s ? `${ramPct}%` : '—'}
          sub={s ? `Свободно: ${s.freePhysicalMemoryMb} МБ` : ''}
          accent={ramPct > 85 ? 'red' : 'purple'}
          icon={<HardDrive className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label="SSE сессии"
          value={s?.activeSseConnections ?? '—'}
          sub={s ? `Потоков: ${s.threadCount}` : ''}
          accent="blue"
          icon={<Wifi className="w-3.5 h-3.5" />}
        />
      </div>

      {/* Uptime */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        <span>Uptime: {s ? fmt(s.uptimeSeconds) : '—'}</span>
      </div>

      {/* Chart */}
      {data.length > 1 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">CPU % и Heap % по времени</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gram" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#6b7280' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area type="monotone" dataKey="cpu" name="CPU" stroke="#34d399" fill="url(#gcpu)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="ram" name="Heap" stroke="#60a5fa" fill="url(#gram)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
