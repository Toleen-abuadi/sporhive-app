import React, { useMemo } from 'react';
import { I18nManager, Text as RNText, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, typography } from '../../theme/tokens';

export function Text({
  children,
  variant = 'body',
  color,
  weight = 'normal',
  style,
  ...props
}) {
  const { colors } = useTheme();
  const isRTL = I18nManager.isRTL;

  const variantStyles = useMemo(
    () => ({
      display: typography.variants.display,
      h1: typography.variants.h1,
      h2: typography.variants.h2,
      h3: typography.variants.h3,
      h4: { fontSize: fontSize.lg, lineHeight: typography.lineHeight.lg, fontWeight: fontWeight.semibold },
      body: typography.variants.body,
      bodyMedium: typography.variants.bodyMedium,
      bodyLarge: { fontSize: fontSize.lg, lineHeight: typography.lineHeight.lg, fontWeight: fontWeight.normal },
      bodySmall: { fontSize: fontSize.sm, lineHeight: typography.lineHeight.sm, fontWeight: fontWeight.normal },
      caption: typography.variants.caption,
      overline: typography.variants.overline,
    }),
    []
  );

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
        { color: textColor, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
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
