import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getColors } from '../../theme/colors';
import { radius } from '../../theme/tokens';

export function Skeleton({ width = '100%', height = 120, radius: radiusOverride, mode = 'light', style }) {
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
