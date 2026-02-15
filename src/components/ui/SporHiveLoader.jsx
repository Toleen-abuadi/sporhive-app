import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from 'react-native';

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
  const { colors, isDark } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  // Core animations (simple)
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  // Layout
  const ringSize = useMemo(() => Math.round(size * 1.55), [size]);
  const orbitRadius = useMemo(() => Math.round(ringSize * 0.38), [ringSize]);
  const dotSize = useMemo(() => Math.max(5, Math.round(size * 0.08)), [size]);

  const shimmerTrackWidth = useMemo(() => {
    const w = Math.round(size * 1.55);
    return Math.max(140, Math.min(220, w));
  }, [size]);

  const shimmerBarWidth = useMemo(
    () => Math.round(shimmerTrackWidth * 0.32),
    [shimmerTrackWidth]
  );

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(!!enabled);
      })
      .catch(() => {});

    const subscription =
      AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
        setReduceMotion(!!enabled);
      }) || null;

    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      spin.stopAnimation();
      pulse.stopAnimation();
      shimmer.stopAnimation();
      spin.setValue(0);
      pulse.setValue(0);
      shimmer.setValue(0);
      return;
    }

    const spinAnim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const shimmerAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    spinAnim.start();
    pulseAnim.start();
    shimmerAnim.start();

    return () => {
      spinAnim.stop();
      pulseAnim.stop();
      shimmerAnim.stop();
    };
  }, [reduceMotion, spin, pulse, shimmer]);

  // Animated values
  const spinDeg = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.05],
  });

  const floatY = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.45],
  });

  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-(shimmerTrackWidth * 0.5), shimmerTrackWidth * 0.5],
  });

  const ringBorder = isDark ? 'rgba(255,132,0,0.55)' : 'rgba(255,132,0,0.45)';
  const glowColor = isDark ? 'rgba(255,132,0,0.60)' : 'rgba(255,132,0,0.32)';

  const cardBg = isDark ? 'rgba(18,18,18,0.92)' : 'rgba(255,255,255,0.92)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel || message || 'Loading'}
    >
      <View
        style={[
          styles.content,
          { backgroundColor: cardBg, borderColor: cardBorder, shadowColor: colors.black },
          contentStyle,
        ]}
      >
        {/* Center layer: glow + orbit */}
        <View pointerEvents="none" style={styles.centerLayer}>
          <Animated.View
            style={[
              styles.glow,
              {
                width: ringSize * 1.2,
                height: ringSize * 1.2,
                borderRadius: (ringSize * 1.2) / 2,
                backgroundColor: glowColor,
                opacity: reduceMotion ? 0.2 : glowOpacity,
                transform: [{ scale: reduceMotion ? 1 : scale }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.orbit,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                transform: [{ rotate: reduceMotion ? '0deg' : spinDeg }],
              },
            ]}
          >
            <View
              style={[
                styles.ring,
                {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  borderColor: ringBorder,
                },
              ]}
            />

            {/* Clean 4 dots (perfectly centered) */}
            <Dot x={0} y={-orbitRadius} size={dotSize} color={colors.accentOrange} />
            <Dot x={orbitRadius} y={0} size={dotSize * 0.9} color={colors.accentOrange} />
            <Dot x={0} y={orbitRadius} size={dotSize * 0.75} color={colors.accentOrange} />
            <Dot x={-orbitRadius} y={0} size={dotSize * 0.85} color={colors.accentOrange} />
          </Animated.View>
        </View>

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surfaceElevated,
              shadowColor: colors.black,
              transform: reduceMotion ? [] : [{ translateY: floatY }, { scale }],
            },
          ]}
        >
          <Image source={logoSource} style={{ width: size * 0.66, height: size * 0.66 }} resizeMode="contain" />
        </Animated.View>

        {/* Shimmer bar */}
        <View
          style={[
            styles.shimmerTrack,
            { width: shimmerTrackWidth, backgroundColor: colors.surfaceElevated, borderColor: cardBorder },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmerBar,
              {
                width: shimmerBarWidth,
                backgroundColor: colors.accentOrange,
                transform: reduceMotion ? [] : [{ translateX: shimmerX }],
                opacity: reduceMotion ? 0.55 : 0.9,
              },
            ]}
          />
        </View>

        {message ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.message}>
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Dot({ x, y, size, color }) {
  const half = size / 2;
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: color,
          transform: [{ translateX: x - half }, { translateY: y - half }],
        },
      ]}
    />
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
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },

  centerLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  glow: {},

  orbit: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.9,
  },

  dot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },

  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },

  shimmerTrack: {
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    opacity: 0.95,
  },

  shimmerBar: {
    height: '100%',
    borderRadius: 999,
  },

  message: {
    textAlign: 'center',
    maxWidth: 280,
  },
});
