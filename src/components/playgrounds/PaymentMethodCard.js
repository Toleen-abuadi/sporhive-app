import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CreditCard } from 'lucide-react-native';

import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';

export function PaymentMethodCard({ title, subtitle, active, onPress }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: active ? colors.accentOrange : colors.surface,
          borderColor: active ? colors.accentOrange : colors.border,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <CreditCard size={20} color={active ? colors.white : colors.accentOrange} />
      </View>
      <View style={styles.content}>
        <Text variant="body" weight="bold" color={active ? colors.white : colors.textPrimary}>
          {title || 'Card on file'}
        </Text>
        <Text variant="caption" color={active ? colors.white : colors.textMuted}>
          {subtitle || 'Visa ·•••• 2341'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
});
