import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors } from './colors';
import { storage } from '../services/storage/storage';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('light'); // Default to light theme
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await storage.getTheme();
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        setTheme('light'); // Default to light if no saved theme
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      setTheme('light');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await storage.setTheme(newTheme);
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        isDark: theme === 'dark',
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
