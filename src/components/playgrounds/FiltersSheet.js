import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SlidersHorizontal } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { spacing, borderRadius, shadows } from '../../theme/tokens';

export function FiltersSheet({ activeFilters = {}, children }) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={isDark ? ['#0F172A', '#111827'] : ['#F8FAFC', '#EEF2FF']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <SlidersHorizontal size={16} color={colors.accentOrange} />
        </View>
        <View>
          <Text variant="body" weight="bold">
            Curate your playground
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            {activeFilters?.city || 'All cities'} · {activeFilters?.sport || 'All sports'}
          </Text>
        </View>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249,115,22,0.12)',
  },
  content: {
    marginTop: spacing.md,
  },
});
