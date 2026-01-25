import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Filter } from 'lucide-react-native';

import { AppHeader } from '../../components/ui/AppHeader';
import { AppScreen } from '../../components/ui/AppScreen';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Skeleton } from '../../components/ui/Skeleton';
import { Text } from '../../components/ui/Text';
import { VenueCard } from '../../components/playgrounds/VenueCard';
import { VenuesFilterSheet } from '../../components/playgrounds/VenuesFilterSheet';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { API_BASE_URL } from '../../services/api/client';
import { usePlaygroundsActions, usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { borderRadius, spacing } from '../../theme/tokens';

/** ---------- helpers ---------- */
const normalizeImageUrl = (uri) => {
  if (!uri) return null;
  if (typeof uri !== 'string') return null;
  if (uri.startsWith('http')) return uri;
  const normalized = uri.startsWith('/') ? uri : `/${uri}`;
  return `${API_BASE_URL}${normalized}`;
};

const getVenueImages = (venue) => {
  const images = Array.isArray(venue?.images) ? venue.images : venue?.venue_images || [];
  return images
    .map((img) => img?.url || img?.path || img?.filename || '')
    .filter(Boolean)
    .map((uri) => normalizeImageUrl(uri))
    .filter(Boolean);
};

const resolveVenueImage = (venue) => {
  if (venue?.image) return normalizeImageUrl(venue.image);
  const images = getVenueImages(venue);
  if (images.length) return images[0];
  if (venue?.academy_profile?.hero_image) return normalizeImageUrl(venue.academy_profile.hero_image);
  return null;
};

const formatMoney = (amount, currency) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${Number(amount).toFixed(0)}`;
};

const resolvePriceLabel = (venue, t) => {
  const currency = venue?.currency || 'AED';

  if (venue?.price !== null && venue?.price !== undefined) {
    const priceLabel = formatMoney(venue.price, currency);
    return priceLabel ? `${priceLabel}` : t('playgrounds.explore.fromPrice', { price: '—' });
  }

  const durations = Array.isArray(venue?.durations)
    ? venue.durations
    : Array.isArray(venue?.venue_durations)
    ? venue.venue_durations
    : [];

  if (!durations.length) return t('service.playgrounds.common.placeholder');

  const prices = durations
    .map((item) => Number(item?.base_price))
    .filter((value) => Number.isFinite(value));

  if (!prices.length) return t('service.playgrounds.common.placeholder');

  const minPrice = Math.min(...prices);
  const label = formatMoney(minPrice, currency);

  return label
    ? t('playgrounds.explore.fromPrice', { price: label })
    : t('service.playgrounds.common.placeholder');
};

const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);
  return debounced;
};

/** ---------- screen ---------- */
export function PlaygroundsExploreScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    venues,
    venuesLoading,
    venuesError,
    filters,
    activities,
    activitiesLoading,
    filtersLoaded,
  } = usePlaygroundsStore((state) => ({
    venues: state.venues,
    venuesLoading: state.venuesLoading,
    venuesError: state.venuesError,
    filters: state.filters,
    activities: state.activities,
    activitiesLoading: state.activitiesLoading,
    filtersLoaded: state.filtersLoaded,
  }));

  const {
    hydrate,
    setFilters,
    applyFilters,
    resetFilters,
    listVenues,
    listActivities,
    setSelectedVenue,
  } = usePlaygroundsActions();

  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.baseLocation || '');

  const debouncedSearch = useDebouncedValue(searchQuery, 350);

  /** init */
  useEffect(() => {
    hydrate();
    listActivities({ include_inactive: false });
  }, [hydrate, listActivities]);

  /** initial venues list once filters are hydrated */
  useEffect(() => {
    if (!filtersLoaded) return;
    listVenues();
  }, [filtersLoaded, listVenues]);

  /** keep local input synced if store changes */
  useEffect(() => {
    if (!filtersLoaded) return;
    if (filters.baseLocation !== searchQuery) setSearchQuery(filters.baseLocation || '');
  }, [filters.baseLocation, filtersLoaded, searchQuery]);

  /** fade in */
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  /** debounced search -> filters -> refresh */
  useEffect(() => {
    if (!filtersLoaded) return;

    const run = async () => {
      setFilters({ baseLocation: debouncedSearch });
      await applyFilters();
      await listVenues();
    };

    run();
  }, [applyFilters, debouncedSearch, filtersLoaded, listVenues, setFilters]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await listVenues();
    setRefreshing(false);
  }, [listVenues]);

  const handleApplyFilters = useCallback(
    async (nextFilters) => {
      setFilters(nextFilters);
      await applyFilters();
      await listVenues();
    },
    [applyFilters, listVenues, setFilters]
  );

  const renderSkeletons = useMemo(() => {
    return (
      <View style={styles.skeletonWrap}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton
            key={`skeleton-${index}`}
            height={220}
            radius={borderRadius.lg}
            mode={isDark ? 'dark' : 'light'}
            style={{ marginBottom: spacing.lg }}
          />
        ))}
      </View>
    );
  }, [isDark]);

  /** header for FlatList (so FlatList is the only vertical scroller) */
  const ListHeader = useMemo(() => {
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <AppHeader title={t('playgrounds.explore.header')} />

        <View style={styles.segmentedWrap}>
          <SegmentedControl
            value="explore"
            onChange={(value) => {
              if (value === 'bookings') router.push('/playgrounds/bookings');
            }}
            options={[
              { value: 'explore', label: t('playgrounds.explore.header') },
              { value: 'bookings', label: t('playgrounds.bookings.title') },
            ]}
          />
        </View>

        <View style={styles.searchRow}>
          <Input
            label={t('playgrounds.explore.searchLabel')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('playgrounds.explore.searchPlaceholder')}
            leftIcon="search"
            accessibilityLabel={t('playgrounds.explore.searchLabel')}
          />

          <Button
            variant="secondary"
            size="small"
            onPress={() => setFilterOpen(true)}
            style={styles.filterButton}
            accessibilityLabel={t('playgrounds.explore.filters')}
          >
            <Filter size={16} color={colors.textPrimary} /> {t('playgrounds.explore.filters')}
          </Button>
        </View>
      </Animated.View>
    );
  }, [colors.textPrimary, fadeAnim, router, searchQuery, t]);

  /** safe activity name resolve */
  const resolveActivityLabel = useCallback(
    (venue) => {
      if (!venue?.activity_id) return t('playgrounds.explore.multiSport');
      const found = activities.find((a) => String(a.id) === String(venue.activity_id));
      return found?.name || t('playgrounds.explore.multiSport');
    },
    [activities, t]
  );

  /** IMPORTANT: AppScreen must NOT scroll; FlatList owns scrolling */
  return (
    <AppScreen contentStyle={styles.container}>
      <FlatList
        data={venuesLoading || venuesError ? [] : venues}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accentOrange}
          />
        }
        ListEmptyComponent={
          venuesLoading ? (
            renderSkeletons
          ) : venuesError ? (
            <ErrorState
              title={t('playgrounds.explore.errorTitle')}
              message={venuesError}
              onAction={listVenues}
            />
          ) : (
            <EmptyState
              title={t('playgrounds.explore.noVenuesTitle')}
              message={t('playgrounds.explore.noVenuesMessage')}
              actionLabel={t('playgrounds.explore.resetFilters')}
              onAction={resetFilters}
            />
          )
        }
        renderItem={({ item }) => {
          const imageUrl = resolveVenueImage(item);

          const ratingRaw = item?.avg_rating ?? item?.rating ?? 0;
          const rating = Number.isFinite(Number(ratingRaw)) ? Number(ratingRaw) : 0;
          const ratingCount = Number.isFinite(Number(item?.ratings_count))
            ? Number(item.ratings_count)
            : 0;

          const activityLabel = resolveActivityLabel(item);
          const discountLabel = item?.special_offer_note || item?.academy_profile?.special_offers_note || null;
          const priceLabel = resolvePriceLabel(item, t);
          const locationText = item?.base_location || item?.academy_profile?.location_text || '';

          return (
            <View style={styles.cardWrap}>
              <VenueCard
                title={item?.name || item?.title || t('service.playgrounds.common.playground')}
                location={locationText}
                imageUrl={imageUrl}
                rating={ratingCount ? rating : 0}
                hasOffer={!!item?.has_special_offer}
                discountLabel={discountLabel}
                priceLabel={priceLabel}
                activityLabel={activityLabel || undefined}
                onPress={() => {
                  if (!item?.id) return;
                  const id = String(item.id);
                  setSelectedVenue(id);
                  router.push(`/playgrounds/venue/${id}`);
                }}
              />
            </View>
          );
        }}
      />

      <VenuesFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        activities={activities}
        loadingActivities={activitiesLoading}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  segmentedWrap: {
    marginBottom: spacing.lg,
  },
  searchRow: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardWrap: {
    marginBottom: spacing.lg,
  },
  skeletonWrap: {
    paddingTop: spacing.md,
  },
});
