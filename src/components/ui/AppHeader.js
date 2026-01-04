import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
  rightComponent,
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.leftContainer}>
        {leftIcon && (
          <TouchableOpacity onPress={onLeftPress} style={styles.iconButton}>
            <Feather name={leftIcon} size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
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
        {rightComponent || (
          rightIcon && (
            <TouchableOpacity onPress={onRightPress} style={styles.iconButton}>
              <Feather name={rightIcon} size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )
        )}
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
