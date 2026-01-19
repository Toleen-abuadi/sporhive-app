import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette } from './palette';
import { storage, APP_STORAGE_KEYS } from '../services/storage/storage';

const ThemeContext = createContext();

const resolveTheme = (savedTheme, systemScheme) => {
  if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
  if (savedTheme === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
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
      const normalized = typeof savedTheme === 'string' ? savedTheme.toLowerCase() : null;
      setTheme(normalized || 'system');
    } catch (error) {
      if (__DEV__) {
        console.warn('Error loading theme:', error);
      }
      setTheme('system');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const activeTheme = resolveTheme(theme, systemColorScheme);
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await storage.setItem(APP_STORAGE_KEYS.THEME, newTheme);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error saving theme:', error);
      }
    }
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
        colors,
        isDark: resolvedTheme === 'dark',
        isLoading,
        toggleTheme,
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
