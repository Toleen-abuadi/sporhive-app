import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Image, AccessibilityInfo } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { Text } from './Text';

const logoSource = require('../../../assets/images/logo.png');

export function SporHiveLoader({
  size = 96,
  label = 'Loading',
  message,
  fullScreen = true,
  style,
}) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setReduceMotionEnabled(Boolean(enabled));
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.05,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotionEnabled, scale]);

  const haloStyle = useMemo(() => {
    const base = colors.accentOrange || colors.textPrimary;
    return {
      backgroundColor: `${base}22`,
      borderColor: `${base}55`,
    };
  }, [colors.accentOrange, colors.textPrimary]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        { backgroundColor: colors.background },
        style,
      ]}
    >
      <View style={[styles.halo, haloStyle, { width: size + 36, height: size + 36 }]} />
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }], opacity }]}>
        <Image source={logoSource} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
      {message ? (
        <Text variant="bodySmall" style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fullScreen: {
    flex: 1,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  halo: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
});
