import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export function PortalActionBanner({ title, description, actionLabel, onAction }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: colors.warning, backgroundColor: '#3D2A0F' }]}>
      <TriangleAlert size={18} color={colors.warning} />
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="bold" color={colors.warning}>{title}</Text>
        {description ? <Text variant="caption" color={colors.textSecondary}>{description}</Text> : null}
      </View>
      {actionLabel && onAction ? <Button size="small" onPress={onAction}>{actionLabel}</Button> : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { borderWidth: 1, borderRadius: 16, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm } });
