import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/tokens';

export function SlotGrid({ slots = [], selectedSlot, onSelect }) {
  const { colors } = useTheme();

  const data = slots.length
    ? slots
    : [
        { id: '1', label: '6:00 PM', price: 'AED 100' },
        { id: '2', label: '7:30 PM', price: 'AED 120' },
        { id: '3', label: '9:00 PM', price: 'AED 140' },
      ];

  return (
    <View style={styles.grid}>
      {data.map((slot) => {
        const active = selectedSlot?.id === slot.id;
        return (
          <Pressable
            key={slot.id}
            onPress={() => onSelect?.(slot)}
            style={[
              styles.slot,
              {
                backgroundColor: active ? colors.accentOrange : colors.surface,
                borderColor: active ? colors.accentOrange : colors.border,
              },
            ]}
          >
            <Text variant="body" weight="bold" color={active ? colors.white : colors.textPrimary}>
              {slot.label}
            </Text>
            <Text variant="caption" color={active ? colors.white : colors.textMuted}>
              {slot.price}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  slot: {
    width: '30%',
    minWidth: 100,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
});
