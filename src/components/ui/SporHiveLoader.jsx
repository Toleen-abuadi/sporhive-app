import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Text } from './Text';
import { spacing } from '../../theme/tokens';

const logoSource = require('../../../assets/images/logo.png');

export function SporHiveLoader({
  size = 96,
  message,
  accessibilityLabel,
  style,
  contentStyle,
}) {
  const { colors } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const ringSize = useMemo(() => Math.round(size * 1.2), [size]);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {});

    const subscription =
      AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
        setReduceMotion(enabled);
      }) || null;

    return () => {
      active = false;
      if (subscription?.remove) subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulse.stopAnimation();
      rotate.stopAnimation();
      pulse.setValue(0);
      rotate.setValue(0);
      return;
    }

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    const rotateAnim = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 3200,
        useNativeDriver: true,
      })
    );

    pulseAnim.start();
    rotateAnim.start();

    return () => {
      pulseAnim.stop();
      rotateAnim.stop();
    };
  }, [pulse, reduceMotion, rotate]);

  const ringStyle = {
    width: ringSize,
    height: ringSize,
    borderRadius: ringSize / 2,
    borderColor: colors.accentOrange,
  };

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel || message}
    >
      <View style={[styles.content, { backgroundColor: colors.surface }, contentStyle]}>
        <Animated.View
          style={[
            styles.ring,
            ringStyle,
            {
              transform: [
                {
                  rotate: rotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 0.9],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.logoWrap,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surfaceElevated,
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1.03],
                  }),
                },
              ],
              shadowColor: colors.black,
            },
          ]}
        >
          <Image source={logoSource} style={{ width: size * 0.65, height: size * 0.65 }} resizeMode="contain" />
        </Animated.View>
        {message ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.message}>
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 28,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  message: {
    textAlign: 'center',
  },
});
