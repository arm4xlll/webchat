import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  bg: string;
  card: string;
  inputBg: string;
  border: string;
  primary: string;
  text: string;
  textSoft: string;
  muted: string;
  msgIn: string;
  msgOut: string;
  msgOutText: string;
  msgOutTextMuted: string;
}

export interface AppTheme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const THEMES: AppTheme[] = [
  {
    id: 'telegram-dark',
    name: 'Telegram Dark',
    colors: {
      bg: '#0e1621', card: '#17212b', inputBg: '#17212b', border: '#0d1924',
      primary: '#3390ec', text: '#e8edf0', textSoft: '#aabbc8', muted: '#708fa0',
      msgIn: '#182533', msgOut: '#2b5278',
      msgOutText: '#e8edf0', msgOutTextMuted: 'rgba(232,237,240,0.5)',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bg: '#0a0a0f', card: '#0f0f18', inputBg: '#0f0f18', border: '#1a1a2e',
      primary: '#7c6ff7', text: '#e2e0ff', textSoft: '#a0a0d0', muted: '#6060a0',
      msgIn: '#0f0f1e', msgOut: '#2d2a5e',
      msgOutText: '#e2e0ff', msgOutTextMuted: 'rgba(226,224,255,0.5)',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      bg: '#0a1520', card: '#0d1e2d', inputBg: '#0d1e2d', border: '#0d2035',
      primary: '#00bcd4', text: '#e0f4f8', textSoft: '#8ab8c8', muted: '#3d7a8a',
      msgIn: '#0d1e2d', msgOut: '#004d6e',
      msgOutText: '#e0f4f8', msgOutTextMuted: 'rgba(224,244,248,0.5)',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      bg: '#0a160d', card: '#0d1f10', inputBg: '#0d1f10', border: '#0d2010',
      primary: '#4caf50', text: '#e0f0e0', textSoft: '#90c090', muted: '#3d7040',
      msgIn: '#0d1f10', msgOut: '#1b5e20',
      msgOutText: '#e0f0e0', msgOutTextMuted: 'rgba(224,240,224,0.5)',
    },
  },
  {
    id: 'pink-dark',
    name: 'Pink Dark',
    colors: {
      bg: '#1a0d14', card: '#241019', inputBg: '#241019', border: '#140a10',
      primary: '#ff4d8d', text: '#ffe6f0', textSoft: '#b5728c', muted: '#80506a',
      msgIn: '#2a1620', msgOut: '#8e2a52',
      msgOutText: '#ffffff', msgOutTextMuted: 'rgba(255,230,240,0.5)',
    },
  },
  {
    id: 'pink',
    name: 'Pink',
    colors: {
      bg: '#fdf0f5', card: '#fff0f5', inputBg: '#fff0f5', border: '#f0d0e0',
      primary: '#e91e63', text: '#2d1a2e', textSoft: '#6a3060', muted: '#80406a',
      msgIn: '#f8e0ec', msgOut: '#f48fb1',
      msgOutText: '#2d1a2e', msgOutTextMuted: 'rgba(45,26,46,0.5)',
    },
  },
];

interface ThemeState {
  themeId: string;
  fontSize: number;
  colors: ThemeColors;
  setTheme: (id: string) => void;
  setFontSize: (size: number) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: 'telegram-dark',
      fontSize: 15,
      colors: THEMES[0].colors,
      setTheme: (id) => {
        const theme = THEMES.find(t => t.id === id) ?? THEMES[0];
        set({ themeId: id, colors: theme.colors });
      },
      setFontSize: (size) => set({ fontSize: size }),
    }),
    { name: 'app-theme', storage: createJSONStorage(() => AsyncStorage) }
  )
);

export const useTheme = () => useThemeStore(s => s.colors);
export const useFontSize = () => useThemeStore(s => s.fontSize);
