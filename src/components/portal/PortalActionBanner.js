import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

export function PortalActionBanner({ title, description, actionLabel, onAction }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  return (
    <View
      style={[
        styles.wrap,
        isRTL && styles.wrapRtl,
        { borderColor: colors.warning, backgroundColor: '#3D2A0F' },
      ]}
    >
      <TriangleAlert size={18} color={colors.warning} />
      <View style={[styles.content, isRTL && styles.contentRtl]}>
        <Text variant="body" weight="bold" color={colors.warning}>{title}</Text>
        {description ? <Text variant="caption" color={colors.textSecondary}>{description}</Text> : null}
      </View>
      {actionLabel && onAction ? <Button size="small" onPress={onAction}>{actionLabel}</Button> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wrapRtl: {
    flexDirection: 'row-reverse',
  },
  content: {
    flex: 1,
  },
  contentRtl: {
    alignItems: 'flex-end',
  },
});
