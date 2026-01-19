import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getColors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';

export function EmptyState({ title, description, action, mode = 'light' }) {
  const colors = getColors(mode);
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '600',
  },
  description: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.sm,
  },
});
