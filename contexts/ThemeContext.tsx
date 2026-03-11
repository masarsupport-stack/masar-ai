import React, { createContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, AppTheme, getFullTheme } from '../constants/theme';

const THEME_KEY = 'masarai_theme_mode';

interface ThemeContextType {
  mode: ThemeMode;
  colors: AppTheme;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const defaultTheme = getFullTheme('dark');

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: defaultTheme,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') {
        setMode(saved);
      }
    }).catch(() => {});
  }, []);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    AsyncStorage.setItem(THEME_KEY, newMode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setThemeMode]);

  const colors = useMemo(() => getFullTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
