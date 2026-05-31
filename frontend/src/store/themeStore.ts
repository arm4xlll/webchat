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
  /** Text color on own message bubbles and active list items */
  msgOutText: string;
  /** Muted text (timestamps, secondary) on own message bubbles */
  msgOutTextMuted: string;
}

export interface AppTheme {
  id: string;
  name: string;
  icon: string;
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
      msgOutText: '#ffffff',
      msgOutTextMuted: 'rgba(255,255,255,0.6)',
    },
  },
  {
    id: 'pink',
    name: 'Розовый',
    icon: 'Heart',
    colors: {
      bg: '#fdf0f5',
      sidebarBg: '#fce4ec',
      border: '#f4c2d0',
      primary: '#e91e63',
      text: '#2d0d1f',
      textSecondary: '#9e4060',
      msgIn: '#ffffff',
      msgOut: '#f48fb1',
      hover: '#fad4e0',
      active: '#f48fb1',
      inputBg: '#ffffff',
      msgOutText: '#2d0d1f',
      msgOutTextMuted: 'rgba(45,13,31,0.65)',
    },
  },
  {
    id: 'pink-dark',
    name: 'Розовый тёмный',
    icon: 'Heart',
    colors: {
      bg: '#1a0d14',
      sidebarBg: '#241019',
      border: '#140a10',
      primary: '#ff4d8d',
      text: '#ffe6f0',
      textSecondary: '#b5728c',
      msgIn: '#2a1620',
      msgOut: '#8e2a52',
      hover: '#2d1822',
      active: '#8e2a52',
      inputBg: '#241019',
      msgOutText: '#ffffff',
      msgOutTextMuted: 'rgba(255,230,240,0.6)',
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
      msgOutText: '#ffffff',
      msgOutTextMuted: 'rgba(255,255,255,0.6)',
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
      msgOutText: '#ffffff',
      msgOutTextMuted: 'rgba(255,255,255,0.6)',
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
      msgOutText: '#ffffff',
      msgOutTextMuted: 'rgba(255,255,255,0.6)',
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

  // tg-* variables (chat area)
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
  root.setProperty('--color-tg-msg-out-text', c.msgOutText);
  root.setProperty('--color-tg-msg-out-text-muted', c.msgOutTextMuted);
  root.setProperty('--chat-font-size', FONT_SIZE_MAP[fontSize]);

  // shadcn/ui variables (auth pages, modals, settings, components)
  root.setProperty('--background', c.bg);
  root.setProperty('--foreground', c.text);
  root.setProperty('--card', c.sidebarBg);
  root.setProperty('--card-foreground', c.text);
  root.setProperty('--popover', c.sidebarBg);
  root.setProperty('--popover-foreground', c.text);
  root.setProperty('--primary', c.primary);
  root.setProperty('--primary-foreground', c.msgOutText);
  root.setProperty('--secondary', c.hover);
  root.setProperty('--secondary-foreground', c.text);
  root.setProperty('--muted', c.hover);
  root.setProperty('--muted-foreground', c.textSecondary);
  root.setProperty('--accent', c.active);
  root.setProperty('--accent-foreground', c.msgOutText);
  root.setProperty('--border', c.border);
  root.setProperty('--input', c.inputBg);
  root.setProperty('--ring', c.primary);
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
