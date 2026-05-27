import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateSettings as apiUpdateSettings } from '../api/users';

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
  icon: string; // lucide icon name — kept for future use
  colors: ThemeColors;
}

export const THEMES: AppTheme[] = [
  {
    id: 'telegram-dark',
    name: 'Telegram',
    icon: 'MessageCircle',
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
    name: 'Розовый',
    icon: 'Heart',
    colors: {
      bg: '#111118',
      sidebarBg: '#18151f',
      border: '#0e0d14',
      primary: '#f48fb1',
      text: '#fff0f5',
      textSecondary: '#a898b8',
      msgIn: '#201e2a',
      msgOut: '#b5406e',
      hover: '#221f2c',
      active: '#b5406e',
      inputBg: '#18151f',
    },
  },
  {
    id: 'midnight',
    name: 'Полночь',
    icon: 'Moon',
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
    icon: 'Waves',
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
    icon: 'TreePine',
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

/** Sends settings to server (best-effort, no error thrown to UI). */
async function syncToServer(themeId: string, fontSize: FontSize) {
  try {
    await apiUpdateSettings(themeId, fontSize);
  } catch (e) {
    console.warn('[Theme] Failed to sync settings to server', e);
  }
}

interface ThemeState {
  themeId: string;
  fontSize: FontSize;
  setTheme: (id: string, serverSync?: boolean) => void;
  setFontSize: (size: FontSize, serverSync?: boolean) => void;
  applyCurrentTheme: () => void;
  /** Apply settings received from server without triggering another server sync */
  applyFromServer: (themeId: string, fontSize: FontSize) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: 'telegram-dark',
      fontSize: 'medium',

      setTheme: (id, serverSync = true) => {
        const theme = THEMES.find(t => t.id === id) ?? THEMES[0];
        set({ themeId: id });
        applyTheme(theme, get().fontSize);
        if (serverSync) syncToServer(id, get().fontSize);
      },

      setFontSize: (size, serverSync = true) => {
        set({ fontSize: size });
        const theme = THEMES.find(t => t.id === get().themeId) ?? THEMES[0];
        applyTheme(theme, size);
        if (serverSync) syncToServer(get().themeId, size);
      },

      applyCurrentTheme: () => {
        const { themeId, fontSize } = get();
        const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];
        applyTheme(theme, fontSize);
      },

      applyFromServer: (themeId, fontSize) => {
        const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];
        set({ themeId: theme.id, fontSize });
        applyTheme(theme, fontSize);
      },
    }),
    { name: 'app-theme' }
  )
);
