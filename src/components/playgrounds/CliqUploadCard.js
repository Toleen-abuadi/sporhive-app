import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { UploadCloud } from 'lucide-react-native';

import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/tokens';

export function CliqUploadCard({ title, subtitle, onPress }) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={[styles.container, { borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
        <UploadCloud size={18} color={colors.accentOrange} />
      </View>
      <View style={styles.content}>
        <Text variant="body" weight="bold">
          {title || 'Upload CliQ receipt'}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          {subtitle || 'Drag or tap to add payment proof'}
        </Text>
      </View>
      <View style={[styles.action, { backgroundColor: colors.surface }]}>
        <Text variant="caption" weight="bold" color={colors.textPrimary}>
          Choose file
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
});
