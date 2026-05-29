import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Users, MessageSquare, Activity } from 'lucide-react';
import MetricCard from './MetricCard';
import type { AdminMetricsSnapshot } from '../../types/admin';

interface Props {
  latest: AdminMetricsSnapshot | null;
  history: AdminMetricsSnapshot[];
}

function msgData(history: AdminMetricsSnapshot[]) {
  return history.map(s => ({
    t: new Date(s.timestamp).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
    mps: +s.business.messagesPerSecond.toFixed(3),
  }));
}

export default function BusinessMetricsPanel({ latest, history }: Props) {
  const b = latest?.business;
  const data = msgData(history);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Всего пользователей"
          value={b?.totalUsers ?? '—'}
          accent="purple"
          icon={<Users className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label="DAU (24ч)"
          value={b?.dailyActiveUsers ?? '—'}
          sub="уникальных сессий"
          accent="blue"
          icon={<Activity className="w-3.5 h-3.5" />}
        />
        <MetricCard
          label="Сообщений сегодня"
          value={b?.messagesToday ?? '—'}
          sub={b ? `${b.messagesPerSecond.toFixed(3)} м/с` : ''}
          accent="green"
          icon={<MessageSquare className="w-3.5 h-3.5" />}
        />
      </div>

      {data.length > 1 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Сообщений в секунду</p>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gmsg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#6b7280' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="mps" name="мс/с" stroke="#a78bfa" fill="url(#gmsg)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
