import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getColors } from '../../theme/colors';
import { radius, spacing, typography } from '../../theme/tokens';

export function SegmentedTabs({ tabs, activeKey, onChange, mode = 'light' }) {
  const colors = getColors(mode);
  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
    >
      {tabs.map((tab) => {
        const selected = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={[
              styles.tab,
              selected && { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? colors.textPrimary : colors.textMuted },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: spacing.xs,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minHeight: 44,
  },
  label: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '600',
  },
});
