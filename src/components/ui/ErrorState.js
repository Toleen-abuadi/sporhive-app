import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { Text } from './Text';
import { Button } from './Button';

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  actionLabel = 'Try Again',
  onAction,
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
        <Feather name="alert-circle" size={48} color={colors.error} />
      </View>

      <Text variant="h4" weight="semibold" style={styles.title}>
        {title}
      </Text>

      <Text variant="body" color={colors.textSecondary} style={styles.message}>
        {message}
      </Text>

      {onAction && (
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
