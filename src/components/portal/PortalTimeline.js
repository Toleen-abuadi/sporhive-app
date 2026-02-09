import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export function PortalTimeline({ steps = [], activeIndex = 0 }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {steps.map((step, index) => {
        const done = index <= activeIndex;
        return (
          <View key={step} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: done ? colors.accentOrange : colors.border }]} />
            <Text variant="caption" color={done ? colors.textPrimary : colors.textMuted}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 999 },
});
