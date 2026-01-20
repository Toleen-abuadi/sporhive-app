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

  // Core animations
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  const ringSize = useMemo(() => Math.round(size * 1.55), [size]);
  const dotSize = Math.max(5, Math.round(size * 0.08));
  const orbitRadius = Math.round(ringSize * 0.38);

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
      if (subscription?.remove) subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Reset if reduce motion
    if (reduceMotion) {
      spin.stopAnimation();
      pulse.stopAnimation();
      floatY.stopAnimation();
      shimmer.stopAnimation();
      spin.setValue(0);
      pulse.setValue(0);
      floatY.setValue(0);
      shimmer.setValue(0);
      return;
    }

    const spinAnim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1700,
        easing: Easing.inOut(Easing.quad),
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

    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const shimmerAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    spinAnim.start();
    pulseAnim.start();
    floatAnim.start();
    shimmerAnim.start();

    return () => {
      spinAnim.stop();
      pulseAnim.stop();
      floatAnim.stop();
      shimmerAnim.stop();
    };
  }, [floatY, pulse, reduceMotion, shimmer, spin]);

  // Derived animated styles
  const spinDeg = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.05],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.55],
  });

  const orbitOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.95],
  });

  const floatTranslateY = floatY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 40],
  });

  const ringBorder = isDark ? 'rgba(255,132,0,0.55)' : 'rgba(255,132,0,0.45)';
  const glowColor = isDark ? 'rgba(255,132,0,0.65)' : 'rgba(255,132,0,0.35)';
  const softCardBg = isDark ? colors.surface : 'rgba(255,255,255,0.96)';

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel || message || 'Loading'}
    >
      <View style={[styles.content, { backgroundColor: softCardBg, borderColor: colors.border }, contentStyle]}>
        {/* Ambient glow blob */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              width: ringSize * 1.15,
              height: ringSize * 1.15,
              borderRadius: (ringSize * 1.15) / 2,
              backgroundColor: glowColor,
              opacity: reduceMotion ? 0.25 : glowOpacity,
              transform: [{ scale: reduceMotion ? 1 : pulseScale }],
            },
          ]}
        />

        {/* Orbit container */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.orbitWrap,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              transform: [{ rotate: reduceMotion ? '0deg' : spinDeg }],
              opacity: reduceMotion ? 0.65 : orbitOpacity,
            },
          ]}
        >
          {/* Soft dashed ring */}
          <View
            style={[
              styles.dashedRing,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderColor: ringBorder,
              },
            ]}
          />

          {/* Orbit dots (placed cardinal + diagonal for “premium motion” vibe) */}
          <Dot x={0} y={-orbitRadius} size={dotSize} color={colors.accentOrange} />
          <Dot x={orbitRadius} y={0} size={dotSize * 0.9} color={colors.accentOrange} />
          <Dot x={0} y={orbitRadius} size={dotSize * 0.75} color={colors.accentOrange} />
          <Dot x={-orbitRadius} y={0} size={dotSize * 0.85} color={colors.accentOrange} />
          <Dot x={orbitRadius * 0.7} y={-orbitRadius * 0.7} size={dotSize * 0.6} color={colors.accentOrange} />
        </Animated.View>

        {/* Logo core */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surfaceElevated,
              shadowColor: colors.black,
              transform: reduceMotion
                ? []
                : [{ translateY: floatTranslateY }, { scale: pulseScale }],
            },
          ]}
        >
          <Image
            source={logoSource}
            style={{ width: size * 0.66, height: size * 0.66 }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Shimmer / progress hint */}
        <View style={[styles.shimmerTrack, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmerBar,
              {
                backgroundColor: colors.accentOrange,
                transform: reduceMotion ? [] : [{ translateX: shimmerX }],
                opacity: reduceMotion ? 0.55 : 0.85,
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
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateX: x }, { translateY: y }],
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
  },

  glow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -1, // small offset to avoid pixel snapping on some Android GPUs
    transform: [{ translateX: -0.5 }, { translateY: -0.5 }],
  },

  orbitWrap: {
    position: 'absolute',
    top: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedRing: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.9,
  },
  dot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: 0,
    marginTop: 0,
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
    width: 140,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    opacity: 0.95,
  },
  shimmerBar: {
    width: 44,
    height: '100%',
    borderRadius: 999,
  },

  message: {
    textAlign: 'center',
    maxWidth: 280,
  },
});
