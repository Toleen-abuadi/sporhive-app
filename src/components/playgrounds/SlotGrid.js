import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

export const SlotGrid = ({ slots = [], selectedSlotId, onSelect }) => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);

  if (!slots.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
          No slots available yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const id = slot?.id || slot?.time || slot;
        const label = slot?.label || slot?.time || slot?.start_time || 'Slot';
        const isSelected = String(selectedSlotId) === String(id);
        const isDisabled = slot?.is_available === false || slot?.available === false;
        return (
          <TouchableOpacity
            key={id}
            onPress={() => onSelect?.(slot)}
            style={[
              styles.slot,
              {
                backgroundColor: isSelected ? theme.colors.primarySoft : theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: isDisabled ? 0.5 : 1,
              },
            ]}
            disabled={isDisabled}
          >
            <Text
              style={[
                styles.slotText,
                { color: isSelected ? theme.colors.primary : theme.colors.textPrimary },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  slot: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  slotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
  },
});
