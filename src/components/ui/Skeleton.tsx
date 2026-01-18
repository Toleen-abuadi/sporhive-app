import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { getColors, ThemeMode } from '../../theme/colors';
import { radius } from '../../theme/tokens';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  radius?: number;
  mode?: ThemeMode;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 120, radius: radiusOverride, mode = 'light', style }: SkeletonProps) {
  const colors = getColors(mode);
  return (
    <View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: radiusOverride ?? radius.md,
          backgroundColor: colors.surfaceElevated,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
