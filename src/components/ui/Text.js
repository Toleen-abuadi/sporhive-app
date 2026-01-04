import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight } from '../../theme/tokens';

export function Text({
  children,
  variant = 'body',
  color,
  weight = 'normal',
  style,
  ...props
}) {
  const { colors } = useTheme();

  const variantStyles = {
    h1: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold },
    h2: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
    h3: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold },
    h4: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
    body: { fontSize: fontSize.base, fontWeight: fontWeight.normal },
    bodyLarge: { fontSize: fontSize.lg, fontWeight: fontWeight.normal },
    bodySmall: { fontSize: fontSize.sm, fontWeight: fontWeight.normal },
    caption: { fontSize: fontSize.xs, fontWeight: fontWeight.normal },
  };

  const weightStyles = {
    normal: { fontWeight: fontWeight.normal },
    medium: { fontWeight: fontWeight.medium },
    semibold: { fontWeight: fontWeight.semibold },
    bold: { fontWeight: fontWeight.bold },
  };

  const textColor = color || colors.textPrimary;

  return (
    <RNText
      style={[
        styles.text,
        variantStyles[variant],
        weightStyles[weight],
        { color: textColor },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  text: {
    includeFontPadding: false,
  },
});
