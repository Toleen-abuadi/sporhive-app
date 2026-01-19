import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { getColors } from '../../theme/colors';
import { radius, spacing, typography } from '../../theme/tokens';

export function Chip({ label, selected = false, onPress, mode = 'light', style }) {
  const colors = getColors(mode);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surfaceElevated,
          borderColor: selected ? colors.accent : colors.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: selected ? colors.accentStrong : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '500',
  },
});
