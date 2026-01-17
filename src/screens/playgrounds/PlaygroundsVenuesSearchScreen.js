import { useMemo, useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { VenueCard } from '../../components/playgrounds/VenueCard';
import { goToVenue } from '../../navigation/playgrounds.routes';
import { useSearch } from '../../services/playgrounds/playgrounds.hooks';
import { usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';

const filterConfig = [
  { key: 'activity', label: 'Activity', options: ['Football', 'Padel', 'Basketball', 'Tennis'] },
  { key: 'location', label: 'Location', options: ['Amman', 'Zarqa', 'Irbid'] },
  { key: 'players', label: 'Players', options: ['2-4', '5-8', '9+'] },
  { key: 'duration', label: 'Duration', options: ['60 min', '90 min', '120 min'] },
  { key: 'offers', label: 'Offers', options: ['Discounted', 'Top Rated'] },
  { key: 'sort', label: 'Sort', options: ['Recommended', 'Price low', 'Price high'] },
];

const skeletonItems = Array.from({ length: 4 }).map((_, index) => ({ id: `skeleton-${index}` }));

const FilterSheet = ({ visible, title, options = [], onSelect, onClose }) => (
  <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.sheetOverlay}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(item) => String(item)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.sheetOption} onPress={() => onSelect(item)}>
              <Text style={styles.sheetOptionText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  </Modal>
);

export const PlaygroundsVenuesSearchScreen = () => {
  const router = useRouter();
  const playgrounds = usePlaygroundsStore();
  const { data, loading, filters, updateFilters, load, error } = useSearch();
  const [query, setQuery] = useState(filters?.query || '');
  const [activeSheet, setActiveSheet] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [refreshing, setRefreshing] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const venues = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(venue => ({
      id: venue.id || String(venue.academy_profile_id) || 'unknown',
      name: venue.name || 'Unknown Venue',
      city: venue.city || venue.location_text || 'Unknown',
      sport: venue.sport || 'Sports',
      rating: venue.rating || '0.0',
      price: venue.price || 'Price on request',
      image: venue.image || null,
    }));
  }, [data]);

  const activeFilters = filters || playgrounds?.filters || {};

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    if (debouncedQuery !== (activeFilters.query || '')) {
      updateFilters({ ...activeFilters, query: debouncedQuery, page: 1 });
    }
  }, [debouncedQuery]);

  const handleQueryChange = (value) => {
    setQuery(value);
  };

  const handleFilterSelect = (key, value) => {
    setActiveSheet(null);
    const newFilters = { ...activeFilters };
    
    // Toggle filter selection
    if (newFilters[key] === value) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    updateFilters({ ...newFilters, page: 1 });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(activeFilters);
    setRefreshing(false);
  };

  const handleEndReached = () => {
    if (!venues.length || loading) return;
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

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#4F6AD7" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Venues</Text>
        <TextInput
          placeholder="Search city, sport, or venue"
          style={styles.search}
          value={query}
          onChangeText={handleQueryChange}
          returnKeyType="search"
        />
      </View>

      <View style={styles.filterBar}>
        <FlatList
          data={filterConfig}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => {
            const isActive = activeFilters?.[item.key];
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveSheet(item.key)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {item.label}
                  {isActive ? ` · ${isActive}` : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
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

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message || 'Failed to load venues'}</Text>
        </View>
      )}

      <FlatList
        data={loading && venues.length === 0 ? skeletonItems : venues}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        keyExtractor={(item) => String(item.id || item.name || Math.random())}
        renderItem={loading && venues.length === 0 ? () => <View style={styles.skeletonCard} /> : renderItem}
        contentContainerStyle={[
          styles.listContent,
          venues.length === 0 && !loading && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F6AD7" />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading && !error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No venues found</Text>
            <Text style={styles.emptyText}>Adjust filters or try another search.</Text>
          </View>
        ) : null}
      />

      {filterConfig.map((filter) => (
        <FilterSheet
          key={filter.key}
          visible={activeSheet === filter.key}
          title={`Select ${filter.label}`}
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
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#11223A',
    marginBottom: 8,
  },
  search: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E6F0',
    fontSize: 14,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
  filterChipActive: {
    backgroundColor: '#4F6AD7',
  },
  filterChipText: {
    fontSize: 12,
    color: '#4F6AD7',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  gridItem: {
    flex: 1,
    margin: 4,
  },
  skeletonCard: {
    height: 150,
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
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#6C7A92',
    textAlign: 'center',
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
    maxHeight: '50%',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
    marginBottom: 16,
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
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFECEE',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#D64545',
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});