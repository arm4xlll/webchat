import { Check, Globe } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

const LANGUAGES = [
  { code: 'ru', label: 'Русский', nativeName: 'Русский', desc: 'Russian' },
  { code: 'en', label: 'English', nativeName: 'English', desc: 'English' },
] as const;

export default function LanguageTab() {
  const { t, language, setLanguage } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          {t('settings.language.title')}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t('settings.language.desc')}
        </p>

        <div className="space-y-2.5">
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === language;
            return (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer text-left bg-input hover:bg-secondary/40"
                style={{
                  borderColor: isActive ? 'var(--color-tg-primary)' : 'var(--color-tg-border)',
                  background: isActive ? 'var(--color-tg-primary)15' : '',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold uppercase"
                    style={{
                      background: isActive ? 'var(--color-tg-primary)20' : 'var(--color-tg-hover)',
                      color: isActive ? 'var(--color-tg-primary)' : 'var(--color-tg-text-secondary)',
                    }}
                  >
                    {lang.code}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{lang.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{lang.desc}</div>
                  </div>
                </div>

                {isActive && (
                  <Check
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--color-tg-primary)' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-secondary border border-border p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
        <Globe className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="leading-normal">{t('settings.language.persisted')}</p>
      </div>
    </div>
  );
}
