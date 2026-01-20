import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette } from './palette';
import { storage, APP_STORAGE_KEYS } from '../services/storage/storage';
import { spacing, borderRadius, typography, shadow } from './tokens';

const ThemeContext = createContext();

const THEME_OPTIONS = ['light', 'dark', 'system'];

const normalizeTheme = (value) => {
  if (typeof value !== 'string') return 'system';
  const normalized = value.toLowerCase();
  return THEME_OPTIONS.includes(normalized) ? normalized : 'system';
};

const resolveTheme = (savedTheme, systemScheme) => {
  const normalized = normalizeTheme(savedTheme);
  if (normalized === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return normalized;
};

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('system');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await storage.getItem(APP_STORAGE_KEYS.THEME);
      setTheme(normalizeTheme(savedTheme));
    } catch (error) {
      if (__DEV__) {
        console.warn('Error loading theme:', error);
      }
      setTheme('system');
    } finally {
      setIsLoading(false);
    }
  };

  const setThemePreference = async (nextTheme) => {
    const normalized = normalizeTheme(nextTheme);
    setTheme(normalized);
    try {
      await storage.setItem(APP_STORAGE_KEYS.THEME, normalized);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error saving theme:', error);
      }
    }
  };

  const toggleTheme = async () => {
    const activeTheme = resolveTheme(theme, systemColorScheme);
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    await setThemePreference(newTheme);
  };

  const resolvedTheme = resolveTheme(theme, systemColorScheme);
  const colors = useMemo(
    () => (resolvedTheme === 'dark' ? darkPalette : lightPalette),
    [resolvedTheme]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        themePreference: theme,
        colors,
        spacing,
        borderRadius,
        typography,
        shadow,
        isDark: resolvedTheme === 'dark',
        isLoading,
        toggleTheme,
        setThemePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
