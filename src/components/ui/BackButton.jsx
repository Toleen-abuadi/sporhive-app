import React, { useMemo } from 'react';
import { I18nManager, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { useTranslation } from '../../services/i18n/i18n';
import { Icon } from './Icon';

export function BackButton({ label, color, size = 20, style, onPress }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();

  const resolvedLabel = label || t('common.back', 'Back');
  const iconName = useMemo(() => {
    const rtl = typeof isRTL === 'boolean' ? isRTL : I18nManager.isRTL;
    return rtl ? 'chevron-right' : 'chevron-left';
  }, [isRTL]);

  const handlePress = () => {
    router.back();
    if (typeof onPress === 'function') {
      onPress();
    }
  };

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
  },
});
