import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from './Text';
import { spacing, borderRadius, fontSize } from '../../theme/tokens';

export function SegmentedControl({ value, onChange, options, style, isRTL = false }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: active ? colors.surface : 'transparent',
                borderColor: active ? colors.border : 'transparent',
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={styles.itemInner}>
              {opt.icon ? <View style={isRTL ? styles.iconRtl : styles.iconLtr}>{opt.icon(active, colors)}</View> : null}
              <Text
                variant="caption"
                weight={active ? 'bold' : 'semibold'}
                style={{ fontSize: fontSize.xs, color: active ? colors.textPrimary : colors.textSecondary }}
              >
                {opt.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 4,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  item: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLtr: {
    marginRight: spacing.xs,
  },
  iconRtl: {
    marginLeft: spacing.xs,
  },
});
