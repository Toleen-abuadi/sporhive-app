import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette } from './palette';

type ThemeContextValue = {
  mode: 'light' | 'dark';
  colors: typeof lightPalette;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const mode = scheme === 'dark' ? 'dark' : 'light';
  const colors = useMemo(() => (mode === 'dark' ? darkPalette : lightPalette), [mode]);
  return <ThemeContext.Provider value={{ mode, colors }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
