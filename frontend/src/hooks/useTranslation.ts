import { useLanguageStore, type Language } from '../store/languageStore';
import { ru } from '../lib/translations/ru';
import { en } from '../lib/translations/en';

const dictionaries = { ru, en } as const;

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function pluralEn(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function translate(lang: Language, path: string, params?: Record<string, string | number>): string {
  const parts = path.split('.');
  let current: any = dictionaries[lang];

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to Russian dictionary
      let fallbackCurrent: any = dictionaries.ru;
      for (const fPart of parts) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && fPart in fallbackCurrent) {
          fallbackCurrent = fallbackCurrent[fPart];
        } else {
          fallbackCurrent = null;
          break;
        }
      }
      current = typeof fallbackCurrent === 'string' ? fallbackCurrent : path;
      break;
    }
  }

  let text = typeof current === 'string' ? current : path;

  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      text = text.replace(new RegExp(`{${key}}`, 'g'), String(val));
    });
  }

  return text;
}

export function useTranslation() {
  const { language, setLanguage } = useLanguageStore();
  const t = (path: string, params?: Record<string, string | number>) =>
    translate(language, path, params);

  const plural = (n: number, forms: { ru: [string, string, string]; en: [string, string] }): string => {
    if (language === 'ru') {
      return pluralRu(n, forms.ru[0], forms.ru[1], forms.ru[2]);
    }
    return pluralEn(n, forms.en[0], forms.en[1]);
  };

  return { t, language, setLanguage, plural };
}
