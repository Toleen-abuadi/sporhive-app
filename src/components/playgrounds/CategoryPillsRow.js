import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

export const CategoryPillsRow = ({ categories = [], activeValue, onSelect }) => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);

  if (!categories.length) return null;

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={categories}
      keyExtractor={(item) => String(item?.value || item)}
      contentContainerStyle={styles.row}
      renderItem={({ item }) => {
        const value = item?.value ?? item;
        const label = item?.label ?? value;
        const isActive = value === activeValue;
        return (
          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => onSelect?.(value)}
          >
            <Text
              style={[
                styles.chipText,
                { color: isActive ? '#FFFFFF' : theme.colors.textPrimary },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      }}
      ListHeaderComponent={<View style={{ width: 16 }} />}
      ListFooterComponent={<View style={{ width: 16 }} />}
    />
  );
};

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
