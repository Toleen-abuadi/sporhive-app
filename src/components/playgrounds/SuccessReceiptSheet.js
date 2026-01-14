import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';

import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';

export function SuccessReceiptSheet({ title, subtitle, items = [] }) {
  const { colors } = useTheme();
  const list = items.length
    ? items
    : [
        { label: 'Venue', value: 'Skyline Arena' },
        { label: 'Date', value: 'Sat, 12 Apr' },
        { label: 'Total', value: 'AED 240' },
      ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
          <CheckCircle2 size={22} color={colors.success || '#10B981'} />
        </View>
        <View>
          <Text variant="h4" weight="bold">
            {title || 'Booking confirmed'}
          </Text>
          <Text variant="bodySmall" color={colors.textMuted}>
            {subtitle || 'Your court is secured and ready'}
          </Text>
        </View>
      </View>
      <View style={styles.divider} />
      {list.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text variant="caption" color={colors.textMuted}>
            {row.label}
          </Text>
          <Text variant="body" weight="bold">
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.25)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
