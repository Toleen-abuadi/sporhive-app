import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

export function PortalListItem({
  title,
  subtitle,
  icon = 'chevron-right',
  leadingIcon,
  onPress,
  rightSlot,
  style,
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surface }, style]}
    >
      {leadingIcon ? (
        <View style={[styles.leadingIcon, { backgroundColor: colors.surfaceElevated || colors.surface }]}
        >
          <Feather name={leadingIcon} size={18} color={colors.accentOrange} />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightSlot ? (
        <View style={styles.rightSlot}>{rightSlot}</View>
      ) : (
        <Feather name={icon} size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  rightSlot: {
    marginLeft: spacing.sm,
  },
});
