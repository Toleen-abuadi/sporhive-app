// API fields used: venues list entries from searchVenues (name, base_location, pitch_size, area_size,
// min_players, max_players, avg_rating, ratings_count, price, duration, images, has_special_offer,
// special_offer_note, academy_profile.*).
import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheet } from '../../components/playgrounds/BottomSheet';
import { CategoryPillsRow } from '../../components/playgrounds/CategoryPillsRow';
import { PlaygroundsHeader } from '../../components/playgrounds/PlaygroundsHeader';
import { VenueCard } from '../../components/playgrounds/VenueCard';
import { VenueCardSkeleton } from '../../components/playgrounds/Skeletons';
import { goToVenue } from '../../navigation/playgrounds.routes';
import { useSearch } from '../../services/playgrounds/playgrounds.hooks';
import { usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

const getActivityOptions = (venues = []) => {
  const map = new Map();
  venues.forEach((venue) => {
    const name = venue?.activity?.name || venue?.activity_name || venue?.activity;
    if (name && !map.has(name)) {
      map.set(name, { label: name, value: name });
    }
  });
  return Array.from(map.values());
};

const getLocationOptions = (venues = []) => {
  const map = new Map();
  venues.forEach((venue) => {
    const location = venue?.base_location || venue?.academy_profile?.location_text;
    if (location && !map.has(location)) {
      map.set(location, { label: location, value: location });
    }
  });
  return Array.from(map.values());
};

const getDurationOptions = (venues = []) => {
  const map = new Map();
  venues.forEach((venue) => {
    const durations = Array.isArray(venue?.duration) ? venue.duration : [];
    durations.forEach((duration) => {
      if (!duration?.minutes) return;
      const label = `${duration.minutes} min`;
      if (!map.has(label)) {
        map.set(label, { label, value: label });
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => parseInt(a.value) - parseInt(b.value));
};

const ratingOptions = [
  { label: '4.5+ rating', value: '4.5' },
  { label: '4.0+ rating', value: '4.0' },
  { label: '3.0+ rating', value: '3.0' },
];

const sortOptions = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Price low to high', value: 'price_low' },
  { label: 'Price high to low', value: 'price_high' },
  { label: 'Top rated', value: 'rating_high' },
];

export const PlaygroundsVenuesSearchScreen = () => {
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);
  const playgrounds = usePlaygroundsStore();
  const { data, loading, filters, updateFilters, load, error } = useSearch();
  const [query, setQuery] = useState(filters?.query || '');
  const [activeSheet, setActiveSheet] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [refreshing, setRefreshing] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const venues = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data;
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
  }, [debouncedQuery, activeFilters, updateFilters]);

  const handleFilterSelect = useCallback(
    (key, value) => {
      setActiveSheet(null);
      const newFilters = { ...activeFilters };
      if (newFilters[key] === value) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      updateFilters({ ...newFilters, page: 1 });
    },
    [activeFilters, updateFilters],
  );

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

  const filterOptions = useMemo(() => {
    const activities = getActivityOptions(venues);
    const locations = getLocationOptions(venues);
    const durations = getDurationOptions(venues);
    const hasOffers = venues.some((venue) => venue?.has_special_offer);
    const hasRatings = venues.some((venue) => Number(venue?.avg_rating || 0) > 0);
    return {
      activity: { label: 'Sport', options: activities },
      location: { label: 'Location', options: locations },
      duration: { label: 'Duration', options: durations },
      offers: { label: 'Offers', options: hasOffers ? [{ label: 'Discounted', value: 'Discounted' }] : [] },
      rating: { label: 'Rating', options: hasRatings ? ratingOptions : [] },
    };
  }, [venues]);

  const renderItem = ({ item }) => (
    <View style={viewMode === 'grid' ? styles.gridItem : undefined}>
      <VenueCard venue={item} onPress={() => goToVenue(router, item.id || '1')} />
    </View>
  );

  const renderFooter = () => {
    if (!loading || venues.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  const activeFilterLabel = (key) => {
    const value = activeFilters?.[key];
    if (!value) return null;
    return ` · ${value}`;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <PlaygroundsHeader
        title="Search venues"
        subtitle="Filter by sport, location, and availability."
      />
      <View style={[styles.searchContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <TextInput
          placeholder="Search city, sport, or venue"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      <CategoryPillsRow
        categories={filterOptions.activity.options}
        activeValue={activeFilters?.activity}
        onSelect={(value) => handleFilterSelect('activity', value)}
      />

      <View style={[styles.filterBar, { borderBottomColor: theme.colors.border }]}>
        {['location', 'duration', 'offers', 'rating'].map((key) => {
          const option = filterOptions[key];
          if (!option || option.options.length === 0) return null;
          const isActive = Boolean(activeFilters?.[key]);
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setActiveSheet(key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isActive ? '#FFFFFF' : theme.colors.textPrimary },
                ]}
              >
                {option.label}
                {activeFilterLabel(key)}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => setActiveSheet('sort')}
        >
          <Text style={[styles.filterChipText, { color: theme.colors.textPrimary }]}>
            Sort{activeFilters?.sort ? ` · ${activeFilters.sort}` : ''}
          </Text>
        </TouchableOpacity>
        <View style={styles.viewToggle}>
          <TouchableOpacity onPress={() => setViewMode('list')}>
            <Text style={[styles.toggleText, { color: viewMode === 'list' ? theme.colors.primary : theme.colors.textMuted }]}>
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('grid')}>
            <Text style={[styles.toggleText, { color: viewMode === 'grid' ? theme.colors.primary : theme.colors.textMuted }]}>
              Grid
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: theme.colors.primarySoft }]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error.message || 'Failed to load venues'}
          </Text>
        </View>
      )}

      <FlatList
        data={venues}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        keyExtractor={(item) => String(item.id || item.name || Math.random())}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          venues.length === 0 && !loading && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          loading ? (
            <>
              <VenueCardSkeleton />
              <VenueCardSkeleton />
            </>
          ) : !error ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No venues found</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                Adjust filters or try another search.
              </Text>
            </View>
          ) : null
        }
      />

      {Object.entries(filterOptions).map(([key, value]) => (
        <BottomSheet
          key={key}
          visible={activeSheet === key}
          title={`Select ${value.label}`}
          onClose={() => setActiveSheet(null)}
        >
          {value.options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sheetOption,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: activeFilters?.[key] === option.value ? theme.colors.primarySoft : 'transparent',
                },
              ]}
              onPress={() => handleFilterSelect(key, option.value)}
            >
              <Text style={[styles.sheetOptionText, { color: theme.colors.textPrimary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </BottomSheet>
      ))}

      <BottomSheet
        visible={activeSheet === 'sort'}
        title="Sort by"
        onClose={() => setActiveSheet(null)}
      >
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.sheetOption,
              {
                borderColor: theme.colors.border,
                backgroundColor: activeFilters?.sort === option.value ? theme.colors.primarySoft : 'transparent',
              },
            ]}
            onPress={() => handleFilterSelect('sort', option.value)}
          >
            <Text style={[styles.sheetOptionText, { color: theme.colors.textPrimary }]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: {
    fontSize: 14,
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewToggle: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 12,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
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
  emptyState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  sheetOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sheetOptionText: {
    fontSize: 14,
  },
  errorContainer: {
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
