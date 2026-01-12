import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

export function PortalEmptyState({ icon = 'inbox', title, description, action }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated || colors.surface }]}
      >
        <Feather name={icon} size={22} color={colors.accentOrange} />
      </View>
      <Text variant="body" weight="semibold" color={colors.textPrimary}>
        {title}
      </Text>
      {description ? (
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.description}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  description: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
  },
});
