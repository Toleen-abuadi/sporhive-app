import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { SlidersHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { VenueCard } from '../../components/playgrounds/VenueCard';
import { FiltersSheet } from '../../components/playgrounds/FiltersSheet';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/tokens';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { normalizeVenueList } from '../../services/playgrounds/playgrounds.normalize';
import { playgroundsStore } from '../../services/playgrounds/playgrounds.store';

const PAGE_SIZE = 10;

const FILTER_OPTIONS = {
  activity: ['Padel', 'Football', 'Tennis', 'Basketball'],
  date: ['Today', 'Tomorrow', 'This weekend', 'Next week'],
  players: ['2 players', '4 players', '6 players', '8+ players'],
  duration: ['60 min', '90 min', '120 min'],
  location: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  academy: ['All academies', 'Elite Club', 'Skyline Arena', 'Coastal Club'],
  specialOffer: ['Only offers', 'All venues'],
  sort: ['Recommended', 'Price: low to high', 'Top rated', 'Closest'],
};

const defaultFilters = {
  query: '',
  activity: 'Padel',
  date: 'Today',
  players: '4 players',
  duration: '90 min',
  location: 'Dubai',
  academy: 'All academies',
  specialOffer: false,
  sort: 'Recommended',
};

function FilterChip({ label, value, onPress }) {
  const { colors } = useTheme();
  const isActive = Boolean(value);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: isActive ? colors.accentOrange : colors.surface,
          borderColor: isActive ? colors.accentOrange : colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text variant="caption" weight="semibold" color={isActive ? colors.white : colors.textPrimary}>
        {label}
      </Text>
      <Text variant="caption" color={isActive ? colors.white : colors.textMuted}>
        {value || 'Any'}
      </Text>
    </Pressable>
  );
}

function FilterSheetContent({ title, options, activeValue, onSelect }) {
  const { colors } = useTheme();

  return (
    <View style={styles.sheetContent}>
      <Text variant="h4" weight="bold">
        {title}
      </Text>
      <View style={styles.sheetOptions}>
        {options.map((option) => {
          const active = activeValue === option;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={[
                styles.sheetOption,
                {
                  backgroundColor: active ? colors.accentOrange : colors.surface,
                  borderColor: active ? colors.accentOrange : colors.border,
                },
              ]}
            >
              <Text variant="body" weight="semibold" color={active ? colors.white : colors.textPrimary}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function PlaygroundsVenuesSearchScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [filters, setFilters] = useState(defaultFilters);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeSheet, setActiveSheet] = useState(null);
  const [checkingIdentity, setCheckingIdentity] = useState(true);

  const summary = useMemo(
    () => `${filters.activity} · ${filters.location} · ${filters.sort}`,
    [filters]
  );

  const loadVenues = useCallback(
    async ({ pageToLoad = 1, append = false, nextFilters = filters } = {}) => {
      if (pageToLoad === 1) {
        setLoading(!append && !refreshing);
      } else {
        setLoadingMore(true);
      }

      const response = await playgroundsApi.searchVenues({
        ...nextFilters,
        page: pageToLoad,
        per_page: PAGE_SIZE,
      });

      const payload = response?.data || {};
      const data = response?.success ? normalizeVenueList(payload) : [];
      const meta = payload.meta || payload.pagination || {};
      const inferredHasMore =
        meta.has_more ??
        meta.hasMore ??
        (meta.next_page != null ? true : data.length === PAGE_SIZE);

      setHasMore(Boolean(inferredHasMore));
      setPage(pageToLoad);
      setResults((prev) => (append ? [...prev, ...data] : data));
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    },
    [filters, refreshing]
  );

  const updateFilters = useCallback(
    async (next) => {
      const updated = { ...filters, ...next };
      setFilters(updated);
      await playgroundsStore.setFilters(updated);
      loadVenues({ pageToLoad: 1, nextFilters: updated });
    },
    [filters, loadVenues]
  );

  useEffect(() => {
    let isMounted = true;
    playgroundsStore.getPublicUserId().then((publicUserId) => {
      if (!isMounted) return;
      if (!publicUserId) {
        router.replace('/playgrounds/identify');
      }
      setCheckingIdentity(false);
    });
    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    let isMounted = true;
    playgroundsStore.getFilters().then((stored) => {
      if (!isMounted) return;
      const merged = { ...defaultFilters, ...(stored || {}) };
      setFilters(merged);
      loadVenues({ pageToLoad: 1, nextFilters: merged });
    });
    return () => {
      isMounted = false;
    };
  }, [loadVenues]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadVenues({ pageToLoad: 1 });
  }, [loadVenues]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    loadVenues({ pageToLoad: page + 1, append: true });
  }, [hasMore, loadingMore, loading, page, loadVenues]);

  if (checkingIdentity) {
    return (
      <Screen>
        <LoadingState message="Preparing your search..." />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Animated.FlatList
        data={results}
        keyExtractor={(item, index) => item.id?.toString?.() || `venue-${index}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text variant="h3" weight="bold">
                Search venues
              </Text>
              <Text variant="body" color={colors.textSecondary}>
                {summary}
              </Text>
            </View>

            <View style={styles.searchRow}>
              <Input
                placeholder="Search by venue or academy"
                value={filters.query}
                onChangeText={(value) => updateFilters({ query: value })}
                leftIcon="search"
                style={styles.searchInput}
              />
              <Pressable
                onPress={() => setActiveSheet('sort')}
                style={[styles.filterButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <SlidersHorizontal size={18} color={colors.accentOrange} />
              </Pressable>
            </View>

            <FiltersSheet activeFilters={filters}>
              <View style={styles.chipGrid}>
                <FilterChip label="Activity" value={filters.activity} onPress={() => setActiveSheet('activity')} />
                <FilterChip label="Date" value={filters.date} onPress={() => setActiveSheet('date')} />
                <FilterChip label="Players" value={filters.players} onPress={() => setActiveSheet('players')} />
                <FilterChip label="Duration" value={filters.duration} onPress={() => setActiveSheet('duration')} />
                <FilterChip label="Location" value={filters.location} onPress={() => setActiveSheet('location')} />
                <FilterChip label="Academy" value={filters.academy} onPress={() => setActiveSheet('academy')} />
                <FilterChip
                  label="Offers"
                  value={filters.specialOffer ? 'Only offers' : 'All venues'}
                  onPress={() => setActiveSheet('specialOffer')}
                />
                <FilterChip label="Sort" value={filters.sort} onPress={() => setActiveSheet('sort')} />
              </View>
            </FiltersSheet>

            <View style={styles.resultsHeader}>
              <Text variant="body" weight="bold">
                {results.length} curated matches
              </Text>
              <Button variant="ghost" onPress={() => updateFilters(defaultFilters)}>
                Reset
              </Button>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 40).duration(240)}
            layout={Layout.springify()}
          >
            <VenueCard venue={item} />
          </Animated.View>
        )}
        ListEmptyComponent={
          loading ? (
            <LoadingState message="Finding the perfect court..." />
          ) : (
            <EmptyState
              title="No venues yet"
              message="Try adjusting your filters or broadening your search."
              actionLabel="Reset filters"
              onAction={() => updateFilters(defaultFilters)}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <LoadingState message="Loading more venues..." size="small" />
            </View>
          ) : null
        }
      />

      <BottomSheetModal visible={activeSheet === 'activity'} onClose={() => setActiveSheet(null)}>
        <FilterSheetContent
          title="Choose activity"
          options={FILTER_OPTIONS.activity}
          activeValue={filters.activity}
          onSelect={(value) => {
            updateFilters({ activity: value });
            setActiveSheet(null);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={activeSheet === 'date'} onClose={() => setActiveSheet(null)}>
        <FilterSheetContent
          title="Select date"
          options={FILTER_OPTIONS.date}
          activeValue={filters.date}
          onSelect={(value) => {
            updateFilters({ date: value });
            setActiveSheet(null);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={activeSheet === 'players'} onClose={() => setActiveSheet(null)}>
        <FilterSheetContent
          title="Players"
          options={FILTER_OPTIONS.players}
          activeValue={filters.players}
          onSelect={(value) => {
            updateFilters({ players: value });
            setActiveSheet(null);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={activeSheet === 'duration'} onClose={() => setActiveSheet(null)}>
        <FilterSheetContent
          title="Session duration"
          options={FILTER_OPTIONS.duration}
          activeValue={filters.duration}
          onSelect={(value) => {
            updateFilters({ duration: value });
            setActiveSheet(null);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={activeSheet === 'location'} onClose={() => setActiveSheet(null)}>
        <FilterSheetContent
          title="Location"
          options={FILTER_OPTIONS.location}
          activeValue={filters.location}
          onSelect={(value) => {
            updateFilters({ location: value });
            setActiveSheet(null);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={activeSheet === 'academy'} onClose={() => setActiveSheet(null)}>
        <FilterSheetContent
          title="Academy"
          options={FILTER_OPTIONS.academy}
          activeValue={filters.academy}
          onSelect={(value) => {
            updateFilters({ academy: value });
            setActiveSheet(null);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={activeSheet === 'specialOffer'} onClose={() => setActiveSheet(null)}>
        <FilterSheetContent
          title="Special offers"
          options={FILTER_OPTIONS.specialOffer}
          activeValue={filters.specialOffer ? 'Only offers' : 'All venues'}
          onSelect={(value) => {
            updateFilters({ specialOffer: value === 'Only offers' });
            setActiveSheet(null);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={activeSheet === 'sort'} onClose={() => setActiveSheet(null)}>
        <FilterSheetContent
          title="Sort by"
          options={FILTER_OPTIONS.sort}
          activeValue={filters.sort}
          onSelect={(value) => {
            updateFilters({ sort: value });
            setActiveSheet(null);
          }}
        />
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  searchInput: {
    flex: 1,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minWidth: 120,
  },
  resultsHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingMore: {
    paddingBottom: spacing.xl,
  },
  sheetContent: {
    gap: spacing.md,
  },
  sheetOptions: {
    gap: spacing.sm,
  },
  sheetOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
