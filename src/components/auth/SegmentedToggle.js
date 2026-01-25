import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { borderRadius, spacing, fontSize } from '../../theme/tokens';

export function SegmentedToggle({ value, onChange, options }) {
  const { colors } = useTheme();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const translate = useRef(new Animated.Value(0)).current;

  const indicatorWidth = layoutWidth / options.length || 0;

  useEffect(() => {
    const index = Math.max(0, options.findIndex((opt) => opt.value === value));
    Animated.spring(translate, {
      toValue: indicatorWidth * index,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();
  }, [value, indicatorWidth, options, translate]);

  return (
    <View
      style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surface }]}
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
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
            style={({ pressed }) => [
              styles.item,
              {
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              variant="bodySmall"
              weight={active ? 'bold' : 'semibold'}
              style={{ color: active ? colors.white : colors.textSecondary, fontSize: fontSize.sm }}
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
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
    padding: 4,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: borderRadius.pill,
  },
  item: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
