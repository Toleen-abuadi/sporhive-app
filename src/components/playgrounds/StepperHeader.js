import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/tokens';

export function StepperHeader({ step = 0, steps = [] }) {
  const { colors, isDark } = useTheme();
  const total = steps.length || 4;
  const progress = Math.min((step + 1) / total, 1);

  return (
    <View style={styles.container}>
      <Text variant="h4" weight="bold">
        {steps[step] || 'Complete your booking'}
      </Text>
      <Text variant="bodySmall" color={colors.textMuted}>
        Step {step + 1} of {total}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={isDark ? ['#22D3EE', '#38BDF8'] : ['#FB923C', '#FDE68A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progress, { width: `${progress * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  track: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
