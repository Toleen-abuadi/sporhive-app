import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { Text } from './Text';
import { Button } from './Button';

export function EmptyState({
  icon = 'inbox',
  title = 'No Data',
  message = 'There is nothing to display here.',
  description,
  action,
  actionLabel,
  onAction,
}) {
  const { colors } = useTheme();
  const iconName = typeof icon === 'string' ? icon : undefined;
  const iconComponent = typeof icon === 'string' ? undefined : icon;
  const bodyText = description || message;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
        <Icon name={iconName} icon={iconComponent} size={48} color={colors.textMuted} />
      </View>

      <Text variant="h4" weight="semibold" style={styles.title}>
        {title}
      </Text>

      <Text variant="body" color={colors.textSecondary} style={styles.message}>
        {bodyText}
      </Text>

      {action ? <View style={styles.action}>{action}</View> : null}

      {actionLabel && onAction && !action && (
        <Button onPress={onAction} variant="primary" style={styles.action}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
  },
});
