import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { VenueCard } from '../../components/playgrounds/VenueCard';
import { goToVenue } from '../../navigation/playgrounds.routes';
import { useSearch } from '../../services/playgrounds/playgrounds.hooks';
import { usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';

const filterConfig = [
  { key: 'activity', label: 'Activity', options: ['Football', 'Padel', 'Basketball'] },
  { key: 'date', label: 'Date', options: ['Today', 'Tomorrow', 'Weekend'] },
  { key: 'players', label: 'Players', options: ['2-4', '5-8', '9+'] },
  { key: 'duration', label: 'Duration', options: ['60 min', '90 min', '120 min'] },
  { key: 'location', label: 'Location', options: ['Amman', 'Zarqa', 'Irbid'] },
  { key: 'offers', label: 'Offers', options: ['Discounted', 'Top Rated', 'Instant'] },
  { key: 'sort', label: 'Sort', options: ['Recommended', 'Price low', 'Price high'] },
];

const skeletonItems = Array.from({ length: 4 }).map((_, index) => ({ id: `skeleton-${index}` }));

const FilterSheet = ({ visible, title, options = [], onSelect, onClose }) => (
  <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.sheetOverlay}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>{title}</Text>
        {options.map((option) => (
          <TouchableOpacity key={option} style={styles.sheetOption} onPress={() => onSelect(option)}>
            <Text style={styles.sheetOptionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </Modal>
);

export const PlaygroundsVenuesSearchScreen = () => {
  const router = useRouter();
  const playgrounds = usePlaygroundsStore();
  const { data, loading, filters, updateFilters, load } = useSearch();
  const [query, setQuery] = useState(filters?.query || '');
  const [activeSheet, setActiveSheet] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [refreshing, setRefreshing] = useState(false);

  const venues = useMemo(() => data || [], [data]);
  const activeFilters = filters || playgrounds?.filters || {};

  const handleQueryChange = (value) => {
    setQuery(value);
    updateFilters({ ...activeFilters, query: value, page: 1 });
  };

  const handleFilterSelect = (key, value) => {
    setActiveSheet(null);
    updateFilters({ ...activeFilters, [key]: value, page: 1 });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(activeFilters);
    setRefreshing(false);
  };

  const handleEndReached = () => {
    if (!venues.length) return;
    const nextPage = (activeFilters.page || 1) + 1;
    updateFilters({ ...activeFilters, page: nextPage });
  };

  const renderItem = ({ item }) => (
    <View style={viewMode === 'grid' ? styles.gridItem : undefined}>
      <VenueCard
        venue={item}
        onPress={() => goToVenue(router, item.id || '1')}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Venues</Text>
        <TextInput
          placeholder="Search city, sport, or venue"
          style={styles.search}
          value={query}
          onChangeText={handleQueryChange}
        />
      </View>

      <View style={styles.filterBar}>
        <FlatList
          data={filterConfig}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setActiveSheet(item.key)}
            >
              <Text style={styles.filterChipText}>
                {item.label}
                {activeFilters?.[item.key] ? ` · ${activeFilters[item.key]}` : ''}
              </Text>
            </TouchableOpacity>
          )}
        />
        <View style={styles.viewToggle}>
          <TouchableOpacity onPress={() => setViewMode('list')}>
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('grid')}>
            <Text style={[styles.toggleText, viewMode === 'grid' && styles.toggleTextActive]}>Grid</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={loading ? skeletonItems : venues}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        keyExtractor={(item) => String(item.id || item.name || item)}
        renderItem={loading ? () => <View style={styles.skeletonCard} /> : renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F6AD7" />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No venues yet</Text>
            <Text style={styles.emptyText}>Adjust filters or try another city.</Text>
          </View>
        ) : null}
      />

      {filterConfig.map((filter) => (
        <FilterSheet
          key={filter.key}
          visible={activeSheet === filter.key}
          title={filter.label}
          options={filter.options}
          onSelect={(option) => handleFilterSelect(filter.key, option)}
          onClose={() => setActiveSheet(null)}
        />
      ))}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#11223A',
  },
  search: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E6F0',
  },
  filterBar: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  filterRow: {
    gap: 10,
    paddingRight: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EFF3FF',
  },
  filterChipText: {
    fontSize: 12,
    color: '#4F6AD7',
    fontWeight: '600',
  },
  viewToggle: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 12,
  },
  toggleText: {
    fontSize: 12,
    color: '#7A8BA8',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#4F6AD7',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  gridItem: {
    flex: 1,
    marginRight: 12,
  },
  skeletonCard: {
    height: 110,
    borderRadius: 18,
    backgroundColor: '#EFF3FF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F4F7FF',
    borderRadius: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
  },
  emptyText: {
    fontSize: 12,
    color: '#6C7A92',
    marginTop: 8,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 36, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
    marginBottom: 12,
  },
  sheetOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F7',
  },
  sheetOptionText: {
    fontSize: 14,
    color: '#2F3B52',
  },
});
