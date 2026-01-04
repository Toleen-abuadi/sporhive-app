import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Card({
  children,
  onPress,
  style,
  elevated = true,
  padding = 'medium',
  ...props
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const paddingStyles = {
    none: { padding: 0 },
    small: { padding: spacing.md },
    medium: { padding: spacing.lg },
    large: { padding: spacing.xl },
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    elevated && shadows.md,
    paddingStyles[padding],
    style,
  ];

  if (onPress) {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[cardStyle, animatedStyle]}
        {...props}
      >
        {children}
      </AnimatedTouchable>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
});
