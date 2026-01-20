import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';
import { BackButton } from '../ui/BackButton';

export function PortalHeader({ title, subtitle, rightSlot, leftSlot, style, showBack = true }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
    translateY.value = withTiming(0, { duration: 500 });
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const resolvedLeftSlot = useMemo(() => {
    if (leftSlot) return leftSlot;
    if (!showBack) return null;
    return <BackButton />;
  }, [leftSlot, showBack]);

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {resolvedLeftSlot ? <View style={styles.leftSlot}>{resolvedLeftSlot}</View> : null}
      <View style={styles.textBlock}>
        <Text variant="h3" weight="bold" color={colors.textPrimary}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  textBlock: {
    flex: 1,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  leftSlot: {
    marginRight: spacing.md,
  },
  rightSlot: {
    marginLeft: spacing.md,
  },
});
