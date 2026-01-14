import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const SlotGrid = ({ slots = [], selectedSlotId, onSelect }) => {
  if (!slots.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No slots available yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const id = slot?.id || slot?.time || slot;
        const label = slot?.label || slot?.time || slot?.start_time || 'Slot';
        const isSelected = String(selectedSlotId) === String(id);
        return (
          <TouchableOpacity
            key={id}
            onPress={() => onSelect?.(slot)}
            style={[styles.slot, isSelected && styles.slotSelected]}
          >
            <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>{label}</Text>
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
    backgroundColor: '#F4F6FB',
  },
  slotSelected: {
    backgroundColor: '#DDE7FF',
  },
  slotText: {
    fontSize: 12,
    color: '#5A6B86',
    fontWeight: '600',
  },
  slotTextSelected: {
    color: '#2F55C6',
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyText: {
    color: '#7A8BA8',
    fontSize: 13,
  },
});
