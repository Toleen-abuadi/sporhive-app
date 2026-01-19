import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getColors } from '../../theme/colors';
import { radius, shadow, spacing, typography } from '../../theme/tokens';

export function PrimaryButton({ label, onPress, disabled = false, mode = 'light', style }) {
  const colors = getColors(mode);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: disabled ? colors.border : colors.accent },
        style,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function StickyCTA({ label, onPress, priceLabel, priceValue, disabled = false, mode = 'light' }) {
  const colors = getColors(mode);
  return (
    <View style={[styles.stickyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.priceBlock}>
        {priceLabel ? (
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>{priceLabel}</Text>
        ) : null}
        {priceValue ? (
          <Text style={[styles.priceValue, { color: colors.textPrimary }]}>{priceValue}</Text>
        ) : null}
      </View>
      <PrimaryButton label={label} onPress={onPress} disabled={disabled} mode={mode} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stickyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    ...shadow.md,
  },
  priceBlock: {
    flex: 1,
    marginRight: spacing.md,
  },
  priceLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  priceValue: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '700',
  },
});
