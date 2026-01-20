import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { Text } from './Text';

export function AppHeader({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  leftAction,
  rightAction,
  leftSlot,
  rightSlot,
  rightComponent,
}) {
  const { colors } = useTheme();
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

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.leftContainer}>
        {leftSlot ||
          (leftAction ? (
            <TouchableOpacity
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
            </TouchableOpacity>
          ) : leftIcon ? (
            <TouchableOpacity onPress={onLeftPress} style={styles.iconButton}>
              <Icon name={leftIconName} icon={leftIconComponent} size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : null)}
      </View>

      <View style={styles.centerContainer}>
        <Text variant="h3" weight="bold">
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color={colors.textSecondary}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightContainer}>
        {rightSlot ||
          rightComponent ||
          (rightAction ? (
            <TouchableOpacity
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
            </TouchableOpacity>
          ) : rightIcon ? (
            <TouchableOpacity onPress={onRightPress} style={styles.iconButton}>
              <Icon name={rightIconName} icon={rightIconComponent} size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : null)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: spacing.xs,
  },
});
