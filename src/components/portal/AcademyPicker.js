import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PortalCard from './PortalCard';

export default function AcademyPicker({ academies = [], selectedId, onSelect, placeholder = 'Search academy' }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return academies;
    return academies.filter((item) => (item.searchText || item.name || '').toLowerCase().includes(q));
  }, [academies, query]);

  return (
    <PortalCard title="Choose your academy" subtitle="Search and select to continue" style={styles.card}>
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="#A6A4BE"
          style={styles.searchInput}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No academies match your search.</Text>}
        renderItem={({ item }) => {
          const isSelected = item.id === selectedId;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onSelect?.(item)}
              style={[styles.row, isSelected && styles.rowSelected]}
            >
              <View>
                <Text style={styles.label}>{item.name || item.label}</Text>
                {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
              </View>
              <View style={[styles.dot, isSelected && styles.dotActive]} />
            </TouchableOpacity>
          );
        }}
      />
    </PortalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  searchWrap: {
    marginBottom: 12,
  },
  searchInput: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEAF8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1B1B2D',
  },
  separator: {
    height: 10,
  },
  row: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F0FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowSelected: {
    borderColor: '#BEB8FF',
    backgroundColor: '#F4F2FF',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B1B2D',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#7C7C90',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DCD9F5',
  },
  dotActive: {
    backgroundColor: '#6C5CE7',
  },
  emptyText: {
    fontSize: 12,
    color: '#8C8CA3',
    paddingVertical: 8,
  },
});
