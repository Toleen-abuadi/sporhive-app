import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, fontSize } from '../../theme/tokens';

export function Chip({ label, selected = false, onPress, icon, rightIcon, style, textStyle }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: selected ? colors.accentOrangeSoft : colors.surface,
          borderColor: selected ? colors.accentOrange : colors.border,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
    >
      {icon ? <View style={styles.iconLeft}>{icon}</View> : null}
      <Text
        variant="caption"
        weight="semibold"
        style={[
          styles.label,
          { color: selected ? colors.accentOrange : colors.textPrimary },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
  },
  iconLeft: { marginRight: 2 },
  iconRight: { marginLeft: 2 },
});
