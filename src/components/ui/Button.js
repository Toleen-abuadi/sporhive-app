import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/tokens';
import { Text } from './Text';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyles = {
    primary: {
      backgroundColor: colors.accentOrange,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: colors.error,
    },
  };

  const sizeStyles = {
    small: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    medium: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    large: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
  };

  const textColorMap = {
    primary: colors.white,
    secondary: colors.textPrimary,
    ghost: colors.textPrimary,
    danger: colors.white,
  };

  const isDisabled = disabled || loading;

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        variantStyles[variant],
        sizeStyles[size],
        animatedStyle,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColorMap[variant]} />
      ) : (
        <Text
          variant="body"
          weight="semibold"
          color={textColorMap[variant]}
          style={textStyle}
        >
          {children}
        </Text>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  },
});
