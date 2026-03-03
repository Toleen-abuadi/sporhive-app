import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { useI18n } from '../../services/i18n/i18n';
import { Text } from './Text';

export function ThemedLoader({
  mode = 'fullScreen',
  fullScreen,
  inline,
  size,
  label,
  message,
  accessibilityLabel,
  style,
  contentStyle,
  textStyle,
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();

  const resolvedMode = useMemo(() => {
    if (inline) return 'inline';
    if (fullScreen === false) return 'inline';
    return mode === 'inline' ? 'inline' : 'fullScreen';
  }, [fullScreen, inline, mode]);

  const resolvedLabel = label ?? message ?? null;
  const resolvedA11yLabel = accessibilityLabel || t('common.loading');
  const spinnerSize = typeof size === 'number' ? size : resolvedMode === 'inline' ? 'small' : 'large';

  if (resolvedMode === 'inline') {
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={resolvedA11yLabel}
        style={[
          styles.inlineContainer,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
          style,
        ]}
      >
        <ActivityIndicator size={spinnerSize} color={colors.accentOrange} />
        {resolvedLabel ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={textStyle}>
            {resolvedLabel}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={resolvedA11yLabel}
      style={[styles.fullScreenContainer, style]}
    >
      <View style={[styles.fullScreenContent, contentStyle]}>
        <ActivityIndicator size={spinnerSize} color={colors.accentOrange} />
        {resolvedLabel ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={[styles.fullScreenLabel, textStyle]}>
            {resolvedLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  fullScreenContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  fullScreenLabel: {
    textAlign: 'center',
  },
  inlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});

