import React, { useCallback, useMemo, useRef } from 'react';
import { I18nManager, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { useTranslation } from '../../services/i18n/i18n';
import { Icon } from './Icon';
import { useSmartBack } from '../../navigation/useSmartBack';

export function BackButton({
  label,
  color,
  size = 24,
  style,
  onPress,
  fallbackRoute,
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const isNavigatingRef = useRef(false);
  const { goBack } = useSmartBack({ fallbackRoute });

  const resolvedLabel =
    label || t('accessibility.backButton', t('common.back', 'Back'));
  const iconName = useMemo(() => {
    const rtl = typeof isRTL === 'boolean' ? isRTL : I18nManager.isRTL;
    return rtl ? 'chevron-right' : 'chevron-left';
  }, [isRTL]);

  const handlePress = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    if (typeof onPress === 'function') {
      onPress();
    } else {
      goBack();
    }

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 350);
  }, [goBack, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      hitSlop={12}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Icon name={iconName} size={size} color={color || colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
});
