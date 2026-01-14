import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const chips = [
  { key: 'priceRange', label: 'Price' },
  { key: 'city', label: 'City' },
  { key: 'sport', label: 'Sport' },
  { key: 'amenities', label: 'Amenities' },
];

export const FiltersSheet = ({ activeFilters = {}, onChange, onReset }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filters</Text>
        <TouchableOpacity onPress={onReset}>
          <Text style={styles.reset}>Reset</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chips}>
        {chips.map((chip) => {
          const isActive = Boolean(activeFilters?.[chip.key]);
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onChange?.(chip.key)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1A33',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
  },
  reset: {
    fontSize: 12,
    color: '#4F6AD7',
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F4FA',
  },
  chipActive: {
    backgroundColor: '#DDE7FF',
  },
  chipText: {
    fontSize: 12,
    color: '#55637D',
  },
  chipTextActive: {
    color: '#2F55C6',
    fontWeight: '600',
  },
});
