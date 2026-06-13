import { useTranslation } from '../../hooks/useTranslation';

export type TimeRange = '1h' | '24h' | '7d';

interface Props {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

export default function TimeRangeSelector({ value, onChange }: Props) {
  const { t } = useTranslation();

  const options: { label: string; value: TimeRange }[] = [
    { label: t('admin.timeRanges.1h'), value: '1h' },
    { label: t('admin.timeRanges.24h'), value: '24h' },
    { label: t('admin.timeRanges.7d'), value: '7d' },
  ];

  return (
    <div className="flex rounded-lg overflow-hidden border border-white/10">
      {options.map(opt => (
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
