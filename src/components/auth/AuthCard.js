import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { borderRadius, spacing, shadows } from '../../theme/tokens';

export function AuthCard({ children, style }) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={
          isDark
            ? [colors.surfaceElevated, colors.surface]
            : [colors.surface, colors.white]
        }
        style={[
          styles.card,
          {
            borderColor: colors.border,
            shadowColor: colors.black,
          },
        ]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.md,
  },
});
