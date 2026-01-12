import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { borderRadius, spacing } from '../../theme/tokens';

export function PortalCard({ children, style, gradientColors }) {
  const { colors } = useTheme();
  const gradient = gradientColors || [colors.surface, colors.surfaceElevated || colors.surface];

  return (
    <View style={[styles.shadow, { shadowColor: colors.black }, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: colors.border }]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: 'hidden',
  },
});
