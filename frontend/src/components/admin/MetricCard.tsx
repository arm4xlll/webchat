interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
  icon?: React.ReactNode;
}

const ACCENT_CLASSES: Record<string, string> = {
  green:  'text-emerald-400',
  blue:   'text-sky-400',
  yellow: 'text-amber-400',
  red:    'text-rose-400',
  purple: 'text-violet-400',
};

export default function MetricCard({ label, value, sub, accent = 'blue', icon }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wider">
        {icon && <span className="opacity-70">{icon}</span>}
        {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${ACCENT_CLASSES[accent]}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
