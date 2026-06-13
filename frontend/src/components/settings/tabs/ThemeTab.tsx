import { Check } from 'lucide-react';
import { THEMES, useThemeStore, type AppTheme, type FontSize } from '../../../store/themeStore';
import { useTranslation } from '../../../hooks/useTranslation';

// ── Mini chat preview ──────────────────────────────────────────────────────

function ThemePreview({ theme }: { theme: AppTheme }) {
  const c = theme.colors;
  return (
    <div
      className="w-full flex flex-col select-none"
      style={{ background: c.bg }}
    >
      {/* Fake header */}
      <div
        className="px-2 py-2 flex items-center gap-2 border-b"
        style={{ background: c.sidebarBg, borderColor: c.border }}
      >
        <div className="w-5 h-5 rounded-full shrink-0" style={{ background: c.primary }} />
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-1.5 rounded-full w-12" style={{ background: c.text, opacity: 0.9 }} />
          <div className="h-1 rounded-full w-8" style={{ background: c.textSecondary, opacity: 0.6 }} />
        </div>
      </div>

      {/* Messages area */}
      <div className="px-2 py-3 flex flex-col gap-2">
        {/* Incoming */}
        <div className="flex justify-start">
          <div
            className="rounded-2xl rounded-tl-sm px-2 py-1.5"
            style={{ background: c.msgIn, maxWidth: '85%' }}
          >
            <div className="h-1.5 rounded-full w-16 mb-1.5" style={{ background: c.text, opacity: 0.8 }} />
            <div className="h-1 rounded-full w-10" style={{ background: c.text, opacity: 0.5 }} />
          </div>
        </div>
        {/* Outgoing */}
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-tr-sm px-2 py-1.5"
            style={{ background: c.msgOut, maxWidth: '85%' }}
          >
            <div className="h-1.5 rounded-full w-14 mb-1.5" style={{ background: c.text, opacity: 0.9 }} />
            <div className="h-1 rounded-full w-6 ml-auto" style={{ background: c.text, opacity: 0.6 }} />
          </div>
        </div>
      </div>

      {/* Fake input */}
      <div
        className="px-2 py-2 flex items-center gap-1.5 border-t"
        style={{ background: c.sidebarBg, borderColor: c.border }}
      >
        <div className="flex-1 h-5 rounded-full border" style={{ background: c.inputBg, borderColor: c.border }} />
        <div className="w-5 h-5 rounded-full shrink-0" style={{ background: c.primary }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ThemeTab() {
  const { t, language } = useTranslation();
  const { themeId, fontSize, setTheme, setFontSize } = useThemeStore();

  const fontOptions: { value: FontSize; label: string; desc: string }[] = [
    { value: 'small', label: t('settings.theme.sizes.small'), desc: t('settings.theme.sizes.smallDesc') },
    { value: 'medium', label: t('settings.theme.sizes.medium'), desc: t('settings.theme.sizes.mediumDesc') },
    { value: 'large', label: t('settings.theme.sizes.large'), desc: t('settings.theme.sizes.largeDesc') },
  ];

  const getThemeName = (theme: AppTheme) => {
    if (language === 'en') {
      if (theme.id === 'pink') return 'Pink Light';
      if (theme.id === 'pink-dark') return 'Pink Dark';
      if (theme.id === 'midnight') return 'Midnight';
      if (theme.id === 'ocean') return 'Ocean';
      if (theme.id === 'forest') return 'Forest';
    }
    return theme.name;
  };

  return (
    <div className="space-y-6">
      {/* Theme grid */}
      <div>
        <h3 className="text-xs font-semibold text-tg-text-secondary uppercase tracking-wider mb-3">
          {t('settings.theme.scheme')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEMES.map(theme => {
            const isActive = theme.id === themeId;
            return (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className="group relative rounded-xl overflow-hidden transition-all duration-200 cursor-pointer text-left border flex flex-col"
                style={{
                  borderColor: isActive ? theme.colors.primary : 'var(--color-tg-border)',
                  boxShadow: isActive ? `0 0 0 1px ${theme.colors.primary}` : 'none',
                }}
              >
                <ThemePreview theme={theme} />
                <div
                  className="flex items-center justify-between w-full px-2.5 py-2 border-t"
                  style={{ background: theme.colors.sidebarBg, borderColor: theme.colors.border }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: theme.colors.text }}
                  >
                    {getThemeName(theme)}
                  </span>
                  {isActive && (
                    <Check
                      className="w-3.5 h-3.5 shrink-0 ml-2"
                      style={{ color: theme.colors.primary }}
                    />
                  )}
                </div>
                {/* Hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: `${theme.colors.primary}08` }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Font size */}
      <div>
        <h3 className="text-xs font-semibold text-tg-text-secondary uppercase tracking-wider mb-3">
          {t('settings.theme.fontSize')}
        </h3>
        <div className="flex gap-2">
          {fontOptions.map(opt => {
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
        {t('settings.theme.hint')}
      </p>
    </div>
  );
}
