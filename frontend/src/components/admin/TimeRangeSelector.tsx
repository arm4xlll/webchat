export type TimeRange = '1h' | '24h' | '7d';

interface Props {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

const OPTIONS: { label: string; value: TimeRange }[] = [
  { label: '1 ч', value: '1h' },
  { label: '24 ч', value: '24h' },
  { label: '7 д', value: '7d' },
];

export default function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-white/10">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            value === opt.value
              ? 'bg-tg-primary text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
