import React, { useCallback, useMemo, useRef } from 'react';
import { I18nManager, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { useTranslation } from '../../services/i18n/i18n';
import { Icon } from './Icon';

export function BackButton({ label, color, size = 20, style, onPress }) {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const isNavigatingRef = useRef(false);

  const resolvedLabel = label || t('common.back', 'Back');
  const iconName = useMemo(() => {
    const rtl = typeof isRTL === 'boolean' ? isRTL : I18nManager.isRTL;
    return rtl ? 'chevron-right' : 'chevron-left';
  }, [isRTL]);

  const canGoBack = useMemo(() => {
    const navigationCanGoBack = typeof navigation?.canGoBack === 'function' ? navigation.canGoBack() : false;
    const routerCanGoBack = typeof router?.canGoBack === 'function' ? router.canGoBack() : false;
    return navigationCanGoBack || routerCanGoBack;
  }, [navigation, router]);

  const handlePress = useCallback(() => {
    if (!canGoBack || isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    if (typeof router?.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else if (typeof navigation?.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else if (typeof navigation?.dismiss === 'function') {
      navigation.dismiss();
    } else if (typeof router?.dismiss === 'function') {
      router.dismiss();
    }
    if (typeof onPress === 'function') {
      onPress();
    }
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 350);
  }, [canGoBack, navigation, onPress, router]);

  if (!canGoBack) return null;

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
