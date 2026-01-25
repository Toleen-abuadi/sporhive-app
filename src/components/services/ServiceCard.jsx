import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useI18n } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { borderRadius, spacing } from '../../theme/tokens';

export function ServiceCard({ title, subtitle, icon, color, onPress }) {
  const { colors, isDark } = useTheme();
  const { isRTL } = useI18n();

  return (
    <Card
      onPress={onPress}
      padding="large"
      elevated={!isDark}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: `${color}26`,
            marginLeft: isRTL ? spacing.md : 0,
            marginRight: isRTL ? 0 : spacing.md,
          },
        ]}
      >
        <Feather name={icon} size={24} color={color} />
      </View>
      <View style={[styles.textWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text variant="bodyLarge" weight="bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {title}
        </Text>
        <Text
          variant="bodySmall"
          color={colors.textSecondary}
          style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {subtitle}
        </Text>
      </View>
      <View
        style={[
          styles.chevron,
          { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 },
        ]}
      >
        <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    gap: spacing.sm,
    shadowOpacity: 0.08,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  subtitle: {
    maxWidth: 220,
  },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
