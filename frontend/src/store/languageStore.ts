import { create } from 'zustand';
import { getCookie, setCookie } from '../utils/cookies';

export type Language = 'ru' | 'en';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const detectLanguage = (): Language => {
  const cookieLang = getCookie('app-lang');
  if (cookieLang === 'ru' || cookieLang === 'en') {
    return cookieLang;
  }
  const navLang = navigator.language.toLowerCase();
  if (
    navLang.startsWith('ru') ||
    navLang.startsWith('be') ||
    navLang.startsWith('uk') ||
    navLang.startsWith('kk')
  ) {
    return 'ru';
  }
  return 'en';
};

export const useLanguageStore = create<LanguageState>()((set) => ({
  language: detectLanguage(),
  setLanguage: (lang: Language) => {
    setCookie('app-lang', lang);
    set({ language: lang });
  },
}));
