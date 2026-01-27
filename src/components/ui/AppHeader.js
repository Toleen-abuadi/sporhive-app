import React, { useMemo } from 'react';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { Text } from './Text';
import { safeBack } from '../../navigation/safeBack';
import { useTranslation } from '../../services/i18n/i18n';

export function AppHeader({
  title,
  subtitle,
  showBack,
  onBackPress,
  right,
  variant = 'default',
  centerTitle = false,
  leftSlot,
  rightSlot,
  rightComponent,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  leftAction,
  rightAction,
  style,
  contentStyle,
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const isRTL = I18nManager.isRTL;
  const canGoBack = useMemo(() => {
    if (typeof router?.canGoBack === 'function') {
      return router.canGoBack();
    }
    return false;
  }, [router]);

  const shouldShowBack = typeof showBack === 'boolean' ? showBack : canGoBack;
  const iconName = isRTL ? 'chevron-right' : 'chevron-left';

  const handleBack = () => {
    if (typeof onBackPress === 'function') {
      onBackPress();
      return;
    }
    safeBack(router);
  };

  const leftIconName = typeof leftIcon === 'string' ? leftIcon : undefined;
  const leftIconComponent = typeof leftIcon === 'string' ? undefined : leftIcon;
  const rightIconName = typeof rightIcon === 'string' ? rightIcon : undefined;
  const rightIconComponent = typeof rightIcon === 'string' ? undefined : rightIcon;
  const leftActionIconName =
    leftAction && typeof leftAction.icon === 'string' ? leftAction.icon : undefined;
  const leftActionIconComponent =
    leftAction && typeof leftAction.icon === 'string' ? undefined : leftAction?.icon;
  const rightActionIconName =
    rightAction && typeof rightAction.icon === 'string' ? rightAction.icon : undefined;
  const rightActionIconComponent =
    rightAction && typeof rightAction.icon === 'string' ? undefined : rightAction?.icon;

  const resolvedLeftSlot = useMemo(() => {
    if (leftSlot) return leftSlot;
    if (leftAction) {
      return (
        <Pressable
          onPress={leftAction.onPress}
          style={styles.iconButton}
          accessibilityLabel={leftAction.accessibilityLabel}
        >
          <Icon
            name={leftActionIconName}
            icon={leftActionIconComponent}
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
      );
    }
    if (leftIcon) {
      return (
        <Pressable onPress={onLeftPress} style={styles.iconButton}>
          <Icon name={leftIconName} icon={leftIconComponent} size={24} color={colors.textPrimary} />
        </Pressable>
      );
    }
    if (shouldShowBack) {
      return (
        <Pressable
          onPress={handleBack}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.goBack')}
        >
          <Icon name={iconName} size={24} color={colors.textPrimary} />
        </Pressable>
      );
    }
    return null;
  }, [
    colors.textPrimary,
    handleBack,
    iconName,
    leftAction,
    leftActionIconComponent,
    leftActionIconName,
    leftIcon,
    leftIconComponent,
    leftIconName,
    leftSlot,
    onLeftPress,
    shouldShowBack,
    t,
  ]);

  const resolvedRightSlot = useMemo(() => {
    if (right) return right;
    if (rightSlot) return rightSlot;
    if (rightComponent) return rightComponent;
    if (rightAction) {
      return (
        <Pressable
          onPress={rightAction.onPress}
          style={styles.iconButton}
          accessibilityLabel={rightAction.accessibilityLabel}
        >
          <Icon
            name={rightActionIconName}
            icon={rightActionIconComponent}
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
      );
    }
    if (rightIcon) {
      return (
        <Pressable onPress={onRightPress} style={styles.iconButton}>
          <Icon
            name={rightIconName}
            icon={rightIconComponent}
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
      );
    }
    return null;
  }, [
    colors.textPrimary,
    onRightPress,
    right,
    rightAction,
    rightActionIconComponent,
    rightActionIconName,
    rightComponent,
    rightIcon,
    rightIconComponent,
    rightIconName,
    rightSlot,
  ]);

  const backgroundColor = variant === 'transparent' ? 'transparent' : colors.surface;
  const borderColor = variant === 'transparent' ? 'transparent' : colors.border;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderBottomColor: borderColor,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
    >
      <View
        style={[
          styles.side,
          { alignItems: isRTL ? 'flex-end' : 'flex-start' },
        ]}
      >
        {resolvedLeftSlot}
      </View>
      <View
        style={[
          styles.center,
          centerTitle && styles.centeredTitle,
          contentStyle,
        ]}
      >
        {title ? (
          <Text variant="h3" weight="bold" style={centerTitle ? styles.centerText : null}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            variant="caption"
            color={colors.textSecondary}
            style={centerTitle ? styles.centerText : null}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.side,
          { alignItems: isRTL ? 'flex-start' : 'flex-end' },
        ]}
      >
        {resolvedRightSlot}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  side: {
    width: 56,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centeredTitle: {
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  iconButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
