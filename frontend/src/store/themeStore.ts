import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeColors {
  bg: string;
  sidebarBg: string;
  border: string;
  primary: string;
  text: string;
  textSecondary: string;
  msgIn: string;
  msgOut: string;
  hover: string;
  active: string;
  inputBg: string;
}

export interface AppTheme {
  id: string;
  name: string;
  emoji: string;
  colors: ThemeColors;
}

export const THEMES: AppTheme[] = [
  {
    id: 'telegram-dark',
    name: 'Telegram',
    emoji: '💬',
    colors: {
      bg: '#0e1621',
      sidebarBg: '#17212b',
      border: '#101921',
      primary: '#3390ec',
      text: '#ffffff',
      textSecondary: '#7f91a4',
      msgIn: '#182533',
      msgOut: '#2b5278',
      hover: '#202b36',
      active: '#2b5278',
      inputBg: '#17212b',
    },
  },
  {
    id: 'pink',
    name: 'Роза',
    emoji: '🌸',
    colors: {
      bg: '#1a0e14',
      sidebarBg: '#241218',
      border: '#160a10',
      primary: '#e91e8c',
      text: '#ffe0f0',
      textSecondary: '#c07898',
      msgIn: '#2c1520',
      msgOut: '#8c1e4a',
      hover: '#2e1822',
      active: '#8c1e4a',
      inputBg: '#241218',
    },
  },
  {
    id: 'midnight',
    name: 'Полночь',
    emoji: '🌙',
    colors: {
      bg: '#0a0a0f',
      sidebarBg: '#0f0f1a',
      border: '#080810',
      primary: '#7c6ff7',
      text: '#e8e8ff',
      textSecondary: '#6b6b9e',
      msgIn: '#14141f',
      msgOut: '#2e2b6e',
      hover: '#16162a',
      active: '#2e2b6e',
      inputBg: '#0f0f1a',
    },
  },
  {
    id: 'ocean',
    name: 'Океан',
    emoji: '🌊',
    colors: {
      bg: '#0a1520',
      sidebarBg: '#0d1e30',
      border: '#081220',
      primary: '#00bcd4',
      text: '#e0f7fa',
      textSecondary: '#5a8ea0',
      msgIn: '#0d2336',
      msgOut: '#0a3d5c',
      hover: '#0f2840',
      active: '#0a3d5c',
      inputBg: '#0d1e30',
    },
  },
  {
    id: 'forest',
    name: 'Лес',
    emoji: '🌿',
    colors: {
      bg: '#0a160d',
      sidebarBg: '#0e1f11',
      border: '#08140a',
      primary: '#4caf50',
      text: '#e8f5e9',
      textSecondary: '#5a8060',
      msgIn: '#132018',
      msgOut: '#1b4523',
      hover: '#152318',
      active: '#1b4523',
      inputBg: '#0e1f11',
    },
  },
];

export type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '13px',
  medium: '15px',
  large: '17px',
};

function applyTheme(theme: AppTheme, fontSize: FontSize) {
  const root = document.documentElement.style;
  const c = theme.colors;
  root.setProperty('--color-tg-bg', c.bg);
  root.setProperty('--color-tg-sidebar-bg', c.sidebarBg);
  root.setProperty('--color-tg-border', c.border);
  root.setProperty('--color-tg-primary', c.primary);
  root.setProperty('--color-tg-text', c.text);
  root.setProperty('--color-tg-text-secondary', c.textSecondary);
  root.setProperty('--color-tg-msg-in', c.msgIn);
  root.setProperty('--color-tg-msg-out', c.msgOut);
  root.setProperty('--color-tg-hover', c.hover);
  root.setProperty('--color-tg-active', c.active);
  root.setProperty('--color-tg-input-bg', c.inputBg);
  root.setProperty('--chat-font-size', FONT_SIZE_MAP[fontSize]);
}

interface ThemeState {
  themeId: string;
  fontSize: FontSize;
  setTheme: (id: string) => void;
  setFontSize: (size: FontSize) => void;
  applyCurrentTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: 'telegram-dark',
      fontSize: 'medium',

      setTheme: (id) => {
        const theme = THEMES.find(t => t.id === id) ?? THEMES[0];
        set({ themeId: id });
        applyTheme(theme, get().fontSize);
      },

      setFontSize: (size) => {
        set({ fontSize: size });
        const theme = THEMES.find(t => t.id === get().themeId) ?? THEMES[0];
        applyTheme(theme, size);
      },

      applyCurrentTheme: () => {
        const { themeId, fontSize } = get();
        const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];
        applyTheme(theme, fontSize);
      },
    }),
    { name: 'app-theme' }
  )
);
