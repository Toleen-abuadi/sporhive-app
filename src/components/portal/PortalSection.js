import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export function PortalSection({ title, subtitle, infoText, right }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text variant="body" weight="bold" color={colors.textPrimary}>{title}</Text>
          {infoText ? <CircleAlert size={14} color={colors.textMuted} /> : null}
        </View>
        {subtitle ? <Text variant="caption" color={colors.textSecondary}>{subtitle}</Text> : null}
        {infoText ? <Text variant="caption" color={colors.textMuted}>{infoText}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
});
