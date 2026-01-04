import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export function Divider({ vertical = false, spacing: customSpacing, style }) {
  const { colors } = useTheme();

  const spacingStyle = customSpacing ? { margin: spacing[customSpacing] } : {};

  if (vertical) {
    return (
      <View
        style={[
          styles.verticalDivider,
          { backgroundColor: colors.border },
          spacingStyle,
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.horizontalDivider,
        { backgroundColor: colors.border },
        spacingStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontalDivider: {
    height: 1,
    width: '100%',
  },
  verticalDivider: {
    width: 1,
    height: '100%',
  },
});
