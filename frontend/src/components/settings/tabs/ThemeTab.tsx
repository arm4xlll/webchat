import { Check } from 'lucide-react';
import { THEMES, useThemeStore, type AppTheme, type FontSize } from '../../../store/themeStore';

// ── Mini chat preview ──────────────────────────────────────────────────────

function ThemePreview({ theme }: { theme: AppTheme }) {
  const c = theme.colors;
  return (
    <div
      className="rounded-lg overflow-hidden select-none"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      {/* Fake header */}
      <div
        className="px-2 py-1.5 flex items-center gap-1.5"
        style={{ background: c.sidebarBg, borderBottom: `1px solid ${c.border}` }}
      >
        <div className="w-4 h-4 rounded-full" style={{ background: c.primary, opacity: 0.9 }} />
        <div className="h-1.5 rounded-full w-12" style={{ background: c.text, opacity: 0.7 }} />
        <div className="ml-auto h-1.5 rounded-full w-6" style={{ background: c.textSecondary, opacity: 0.5 }} />
      </div>
      {/* Messages area */}
      <div className="px-2 py-2 space-y-1.5">
        {/* Incoming */}
        <div className="flex justify-start">
          <div
            className="rounded-xl rounded-tl-sm px-2 py-1"
            style={{ background: c.msgIn, maxWidth: '70%' }}
          >
            <div className="h-1.5 rounded w-16" style={{ background: c.text, opacity: 0.8 }} />
            <div className="h-1 rounded w-10 mt-1" style={{ background: c.text, opacity: 0.45 }} />
          </div>
        </div>
        {/* Outgoing */}
        <div className="flex justify-end">
          <div
            className="rounded-xl rounded-tr-sm px-2 py-1"
            style={{ background: c.msgOut, maxWidth: '70%' }}
          >
            <div className="h-1.5 rounded w-20" style={{ background: c.text, opacity: 0.85 }} />
            <div className="h-1 rounded w-8 mt-1 ml-auto" style={{ background: c.text, opacity: 0.5 }} />
          </div>
        </div>
        {/* Incoming 2 */}
        <div className="flex justify-start">
          <div
            className="rounded-xl rounded-tl-sm px-2 py-1"
            style={{ background: c.msgIn, maxWidth: '70%' }}
          >
            <div className="h-1.5 rounded w-12" style={{ background: c.text, opacity: 0.8 }} />
          </div>
        </div>
      </div>
      {/* Fake input */}
      <div
        className="px-2 py-1.5 flex items-center gap-1.5"
        style={{ background: c.sidebarBg, borderTop: `1px solid ${c.border}` }}
      >
        <div className="flex-1 h-4 rounded-full" style={{ background: c.inputBg, border: `1px solid ${c.border}` }} />
        <div className="w-4 h-4 rounded-full" style={{ background: c.primary, opacity: 0.8 }} />
      </div>
    </div>
  );
}

// ── Font size selector ─────────────────────────────────────────────────────

const FONT_OPTIONS: { value: FontSize; label: string; desc: string }[] = [
  { value: 'small', label: 'Мелкий', desc: 'Компактно' },
  { value: 'medium', label: 'Средний', desc: 'По умолчанию' },
  { value: 'large', label: 'Крупный', desc: 'Комфортно' },
];

// ── Main component ─────────────────────────────────────────────────────────

export default function ThemeTab() {
  const { themeId, fontSize, setTheme, setFontSize } = useThemeStore();

  return (
    <div className="space-y-6">
      {/* Theme grid */}
      <div>
        <h3 className="text-xs font-semibold text-tg-text-secondary uppercase tracking-wider mb-3">
          Цветовая схема
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEMES.map(theme => {
            const isActive = theme.id === themeId;
            return (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className="group relative rounded-xl overflow-hidden transition-all duration-200 cursor-pointer"
                style={{
                  outline: isActive
                    ? `2px solid ${theme.colors.primary}`
                    : '2px solid transparent',
                  outlineOffset: '2px',
                }}
              >
                <ThemePreview theme={theme} />
                <div
                  className="flex items-center justify-between px-2 py-1.5 rounded-b-xl"
                  style={{ background: theme.colors.sidebarBg }}
                >
                  <span
                    className="text-xs font-medium"
                    style={{ color: theme.colors.text }}
                  >
                    {theme.name}
                  </span>
                  {isActive && (
                    <Check
                      className="w-3.5 h-3.5"
                      style={{ color: theme.colors.primary }}
                    />
                  )}
                </div>
                {/* Hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: `${theme.colors.primary}10` }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Font size */}
      <div>
        <h3 className="text-xs font-semibold text-tg-text-secondary uppercase tracking-wider mb-3">
          Размер текста в чате
        </h3>
        <div className="flex gap-2">
          {FONT_OPTIONS.map(opt => {
            const isActive = opt.value === fontSize;
            return (
              <button
                key={opt.value}
                onClick={() => setFontSize(opt.value)}
                className="flex-1 py-2.5 px-3 rounded-xl border transition-all cursor-pointer text-center"
                style={{
                  background: isActive ? 'var(--color-tg-primary)20' : 'var(--color-tg-input-bg)',
                  borderColor: isActive ? 'var(--color-tg-primary)' : 'var(--color-tg-border)',
                  color: isActive ? 'var(--color-tg-primary)' : 'var(--color-tg-text)',
                }}
              >
                <div className="font-medium text-sm">{opt.label}</div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: isActive ? 'var(--color-tg-primary)' : 'var(--color-tg-text-secondary)', opacity: 0.8 }}
                >
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview label */}
      <p className="text-xs text-tg-text-secondary text-center">
        Изменения применяются мгновенно — можно листать темы и сразу видеть результат
      </p>
    </div>
  );
}
