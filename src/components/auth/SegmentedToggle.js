import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { borderRadius, spacing, fontSize } from '../../theme/tokens';

const PADDING = 4;

export function SegmentedToggle({ value, onChange, options = [] }) {
  const { colors } = useTheme();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const translate = useRef(new Animated.Value(0)).current;

  const count = Math.max(1, options.length);

  // IMPORTANT: remove padding from width calculations
  const innerWidth = Math.max(0, layoutWidth - PADDING * 2);
  const indicatorWidth = innerWidth / count;

  const index = useMemo(() => {
    const i = options.findIndex((opt) => opt.value === value);
    return Math.max(0, i);
  }, [options, value]);

  useEffect(() => {
    if (!layoutWidth || !options.length) return;

    // LTR: left -> right
    // RTL: right -> left (invert)
    const toValue = I18nManager.isRTL
      ? innerWidth - indicatorWidth * (index + 1)
      : indicatorWidth * index;

    Animated.spring(translate, {
      toValue,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();
  }, [index, indicatorWidth, innerWidth, layoutWidth, options.length, translate]);

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
        },
      ]}
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            width: indicatorWidth,
            backgroundColor: colors.accentOrange,
            transform: [{ translateX: translate }],
          },
        ]}
      />

      {options.map((opt) => {
        const active = opt.value === value;

        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
          >
            <Text
              variant="bodySmall"
              weight={active ? 'bold' : 'semibold'}
              style={{
                color: active ? colors.white : colors.textSecondary,
                fontSize: fontSize.sm,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
    padding: PADDING,
  },
  indicator: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING, // keep this; we offset RTL via translate calculation
    borderRadius: borderRadius.pill,
  },
  item: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
