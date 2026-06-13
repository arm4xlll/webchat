import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { getErrorLog } from '../../api/admin';
import type { ErrorEntry } from '../../types/admin';
import { useTranslation } from '../../hooks/useTranslation';

export default function ErrorLogPanel() {
  const { t, language } = useTranslation();
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getErrorLog(50);
      setErrors(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          {t('admin.errors.logTitle')}
          {errors.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-rose-500/20 text-rose-400 rounded text-[10px] font-bold">
              {errors.length}
            </span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1 rounded text-gray-500 hover:text-gray-300 transition-colors cursor-pointer disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {errors.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">{t('admin.errors.noErrors')}</p>
        ) : (
          errors.map((err, i) => {
            const key = `${err.timestamp}-${i}`;
            const isOpen = expanded === key;
            return (
              <div key={key} className="bg-rose-500/5 border border-rose-500/15 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : key)}
                  className="w-full flex items-start gap-2 p-2.5 text-left cursor-pointer hover:bg-rose-500/5 transition-colors"
                >
                  <span className="text-rose-400 mt-0.5 shrink-0">
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-rose-300">{err.type}</span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(err.timestamp).toLocaleString(language === 'ru' ? 'ru' : 'en')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5 truncate">{err.message}</p>
                  </div>
                </button>
                {isOpen && err.stackTrace && (
                  <pre className="text-[10px] text-gray-400 font-mono p-3 bg-black/20 border-t border-rose-500/10 overflow-x-auto whitespace-pre-wrap break-all">
                    {err.stackTrace.slice(0, 2000)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
