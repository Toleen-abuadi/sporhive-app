import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { RootStack } from './stacks/RootStack';

export function NavigationRoot() {
  const { colors, isDark } = useTheme();

  const theme = {
    dark: isDark,
    colors: {
      primary: colors.accentOrange,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accentOrange,
    },
  };

  return (
    <NavigationContainer theme={theme}>
      <RootStack />
    </NavigationContainer>
  );
}
