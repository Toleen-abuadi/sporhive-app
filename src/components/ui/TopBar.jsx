import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getColors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { useTranslation } from '../../services/i18n/i18n';

export function TopBar({ title, mode = 'light', onBack, actions }) {
  const colors = getColors(mode);
  const { t } = useTranslation();
  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}
    >
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('common.goBack')}
            onPress={onBack}
            hitSlop={12}
            style={[styles.iconButton, { borderColor: colors.border }]}
          >
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
});
