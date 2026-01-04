import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/tokens';
import { Text } from './Text';

export function Badge({ children, variant = 'default', size = 'medium', style }) {
  const { colors } = useTheme();

  const variantStyles = {
    default: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    primary: {
      backgroundColor: colors.accentOrange,
    },
    success: {
      backgroundColor: colors.success,
    },
    warning: {
      backgroundColor: colors.warning,
    },
    error: {
      backgroundColor: colors.error,
    },
  };

  const sizeStyles = {
    small: {
      paddingVertical: spacing.xs / 2,
      paddingHorizontal: spacing.sm,
    },
    medium: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    large: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
  };

  const textColor = variant === 'default' ? colors.textPrimary : colors.white;

  return (
    <View
      style={[
        styles.badge,
        variantStyles[variant],
        sizeStyles[size],
        variant === 'default' && styles.bordered,
        style,
      ]}
    >
      <Text
        variant={size === 'small' ? 'caption' : 'bodySmall'}
        weight="medium"
        color={textColor}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  bordered: {
    borderWidth: 1,
  },
});
