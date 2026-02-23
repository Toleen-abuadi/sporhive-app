import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  I18nManager,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { List, Map as MapIcon, Search, SlidersHorizontal } from 'lucide-react-native';

import { AppScreen } from '../../components/ui/AppScreen';
import { BackButton } from '../../components/ui/BackButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Text } from '../../components/ui/Text';
import { VenueCard } from '../../components/playgrounds/VenueCard';
import { VenuesFilterSheet } from '../../components/playgrounds/VenuesFilterSheet';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { API_BASE_URL } from '../../services/api/client';
import {
  usePlaygroundsActions,
  usePlaygroundsStore,
} from '../../services/playgrounds/playgrounds.store';
import { borderRadius, spacing } from '../../theme/tokens';
import { safeArray } from '../../utils/safeRender';

const MAP_ROUTE = '/playgrounds';

const normalizeImageUrl = (uri) => {
  if (!uri || typeof uri !== 'string') return null;
  if (uri.startsWith('http')) return uri;
  const normalized = uri.startsWith('/') ? uri : `/${uri}`;
  return `${API_BASE_URL}${normalized}`;
};

const getVenueImages = (venue) => {
  const images = Array.isArray(venue?.images)
    ? venue.images
    : venue?.venue_images || [];

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
  if (venue?.academy_profile?.hero_image) {
    return normalizeImageUrl(venue.academy_profile.hero_image);
  }
  return null;
};

const resolveVenueLogo = (venue) => {
  const candidates = [
    venue?.logo,
    venue?.logo_url,
    venue?.academy_profile?.logo,
    venue?.academy_profile?.logo_url,
    venue?.academy_profile?.avatar,
    venue?.academy_profile?.image,
  ];

  const found = candidates.find(Boolean);
  return found ? normalizeImageUrl(found) : null;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMoney = (amount, currency) => {
  const parsed = toNumber(amount);
  if (parsed === null) return null;
  const normalizedCurrency = currency || 'AED';
  return `${parsed.toFixed(2)} ${normalizedCurrency}`;
};

const getDurationList = (venue) =>
  Array.isArray(venue?.durations)
    ? venue.durations
    : Array.isArray(venue?.venue_durations)
    ? venue.venue_durations
    : [];

const resolveFeeValue = (venue, t) => {
  const durations = getDurationList(venue);
  const currency = venue?.currency || durations?.[0]?.currency || 'AED';

  if (venue?.price !== null && venue?.price !== undefined) {
    return (
      formatMoney(venue.price, currency) ||
      t('service.playgrounds.common.placeholder')
    );
  }

  const durationPrices = durations
    .map((item) => toNumber(item?.base_price ?? item?.price))
    .filter((value) => value !== null);

  if (!durationPrices.length) return t('service.playgrounds.common.placeholder');
  const minPrice = Math.min(...durationPrices);
  return formatMoney(minPrice, currency) || t('service.playgrounds.common.placeholder');
};

const resolveSocialProofCount = (venue) => {
  const candidates = [
    venue?.bookings_this_week,
    venue?.weekly_bookings,
    venue?.bookings_weekly,
    venue?.bookings_count_week,
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    const parsed = toNumber(candidates[i]);
    if (parsed && parsed > 0) return Math.round(parsed);
  }

  return null;
};

const normalizeTagSet = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const resolveTags = (venue, activityLabel) => {
  const merged = [
    ...normalizeTagSet(venue?.tags),
    ...normalizeTagSet(venue?.features),
    ...normalizeTagSet(venue?.amenities),
  ];

  if (activityLabel) merged.unshift(activityLabel);

  const seen = new Set();
  return merged
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
};

const resolveCapacityValue = (venue, activityLabel, t) => {
  const numericCandidate =
    toNumber(venue?.capacity) ||
    toNumber(venue?.max_capacity) ||
    toNumber(venue?.max_players) ||
    toNumber(venue?.players_limit) ||
    toNumber(venue?.number_of_players);

  if (numericCandidate) return `${Math.round(numericCandidate)}`;

  const textCandidate =
    venue?.size_label ||
    venue?.size ||
    venue?.venue_type ||
    venue?.type ||
    activityLabel;

  if (textCandidate) return `${textCandidate}`;
  return t('service.playgrounds.common.placeholder');
};

const resolveRatingValue = (venue, t) => {
  const rating = toNumber(venue?.avg_rating ?? venue?.rating);
  const count =
    toNumber(venue?.ratings_count) ||
    toNumber(venue?.rating_count) ||
    toNumber(venue?.reviews_count);

  if (!rating || rating <= 0) return t('service.playgrounds.common.placeholder');

  if (!count) return `★ ${rating.toFixed(1)}`;
  const countLabel = count > 199 ? '200+' : `${Math.round(count)}`;
  return `★ ${rating.toFixed(1)} (${countLabel})`;
};

const resolveAvailability = (venue) => {
  const status = `${venue?.status || venue?.availability_status || ''}`.toLowerCase();
  return (
    venue?.is_open === true ||
    venue?.is_available === true ||
    venue?.open_now === true ||
    status.includes('open') ||
    status.includes('available')
  );
};

const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);
  return debounced;
};

export function PlaygroundsExploreScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();

  const rtl = typeof isRTL === 'boolean' ? isRTL : I18nManager.isRTL;

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
  const venuesList = useMemo(() => safeArray(venues), [venues]);
  const activitiesList = useMemo(() => safeArray(activities), [activities]);
  const venuesErrorMessage = venuesError?.message || venuesError;

  const activityMap = useMemo(() => {
    return new Map(
      activitiesList.map((activity) => [String(activity.id), activity.name || ''])
    );
  }, [activitiesList]);

  useEffect(() => {
    hydrate();
    listActivities({ include_inactive: false });
  }, [hydrate, listActivities]);

  useEffect(() => {
    if (!filtersLoaded) return;
    listVenues();
  }, [filtersLoaded, listVenues]);

  useEffect(() => {
    if (!filtersLoaded) return;
    if (filters.baseLocation !== searchQuery) {
      setSearchQuery(filters.baseLocation || '');
    }
  }, [filters.baseLocation, filtersLoaded, searchQuery]);

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

  const handleResetFilters = useCallback(async () => {
    setSearchQuery('');
    await resetFilters();
    await listVenues();
  }, [listVenues, resetFilters]);

  const handleMapToggle = useCallback(() => {
    router.push(MAP_ROUTE);
  }, [router]);

  const resolveActivityLabel = useCallback(
    (venue) => {
      if (!venue?.activity_id) return t('playgrounds.explore.multiSport');
      return (
        activityMap.get(String(venue.activity_id)) || t('playgrounds.explore.multiSport')
      );
    },
    [activityMap, t]
  );

  const handleOpenVenue = useCallback(
    (venue) => {
      if (!venue?.id) return;
      const id = String(venue.id);
      setSelectedVenue(id);
      router.push(`/playgrounds/venue/${id}`);
    },
    [router, setSelectedVenue]
  );

  const handleBookVenue = useCallback(
    (venue) => {
      if (!venue?.id) return;
      const id = String(venue.id);
      setSelectedVenue(id);
      router.push(`/playgrounds/book/${id}`);
    },
    [router, setSelectedVenue]
  );

  const renderSkeletons = useMemo(() => {
    return (
      <View style={styles.skeletonWrap}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={`venue-skeleton-${index}`} style={styles.skeletonCard}>
            <Skeleton
              height={190}
              radius={borderRadius.xl}
              mode={isDark ? 'dark' : 'light'}
            />
            <Skeleton
              height={18}
              width="65%"
              radius={borderRadius.md}
              mode={isDark ? 'dark' : 'light'}
              style={{ marginTop: spacing.md }}
            />
            <Skeleton
              height={14}
              width="45%"
              radius={borderRadius.md}
              mode={isDark ? 'dark' : 'light'}
              style={{ marginTop: spacing.sm }}
            />
            <Skeleton
              height={52}
              radius={borderRadius.lg}
              mode={isDark ? 'dark' : 'light'}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ))}
      </View>
    );
  }, [isDark]);

  const resultCountLabel = useMemo(
    () => t('playgrounds.discovery.count', { count: venuesList.length }),
    [t, venuesList.length]
  );

  const renderVenueCard = useCallback(
    ({ item }) => {
      const activityLabel = resolveActivityLabel(item);
      const tags = resolveTags(item, activityLabel);
      const socialProofCount = resolveSocialProofCount(item);
      const badges = [];

      if ((socialProofCount && socialProofCount > 50) || item?.has_special_offer) {
        badges.push(t('playgrounds.discovery.mostBooked'));
      }
      if (resolveAvailability(item)) {
        badges.push(t('playgrounds.discovery.availableNow'));
      }
      if (tags.length) {
        badges.push(t('playgrounds.discovery.facilities'));
      }

      const title =
        item?.name || item?.title || t('service.playgrounds.common.playground');
      const location =
        item?.base_location || item?.academy_profile?.location_text || '';

      return (
        <View style={styles.cardWrap}>
          <VenueCard
            title={title}
            location={location}
            heroImageUrl={resolveVenueImage(item)}
            logoImageUrl={resolveVenueLogo(item)}
            badges={badges}
            tags={tags}
            feesValue={resolveFeeValue(item, t)}
            capacityValue={resolveCapacityValue(item, activityLabel, t)}
            ratingValue={resolveRatingValue(item, t)}
            socialProofCount={socialProofCount}
            onPress={() => handleOpenVenue(item)}
            onViewPress={() => handleOpenVenue(item)}
            onBookPress={() => handleBookVenue(item)}
          />
        </View>
      );
    },
    [handleBookVenue, handleOpenVenue, resolveActivityLabel, t]
  );

  return (
    <AppScreen noPadding contentStyle={styles.container}>
      <FlatList
        data={venuesLoading || venuesError ? [] : venuesList}
        keyExtractor={(item, index) =>
          item?.id ? String(item.id) : `venue-${index}`
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerShell}>
            <View
              style={[
                styles.headerTitleRow,
                { flexDirection: rtl ? 'row-reverse' : 'row' },
              ]}
            >
              <BackButton fallbackRoute="/(app)/services" />
              <View style={styles.headerCopy}>
                <Text variant="h3" weight="bold">
                  {t('playgrounds.discovery.title')}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playgrounds.discovery.subtitle')}
                </Text>
              </View>
            </View>

            <View style={styles.segmentWrap}>
              <View
                style={[
                  styles.segmentTrack,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Pressable
                  onPress={handleMapToggle}
                  style={({ pressed }) => [
                    styles.segmentItem,
                    {
                      opacity: pressed ? 0.88 : 1,
                      flexDirection: rtl ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <MapIcon size={14} color={colors.textSecondary} />
                  <Text variant="caption" weight="semibold" color={colors.textSecondary}>
                    {t('playgrounds.discovery.map')}
                  </Text>
                </Pressable>
                <View
                  style={[
                    styles.segmentItem,
                    styles.segmentItemActive,
                    {
                      backgroundColor: colors.primary,
                      flexDirection: rtl ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <List size={14} color={colors.white} />
                  <Text variant="caption" weight="bold" color={colors.white}>
                    {t('playgrounds.discovery.list')}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  flexDirection: rtl ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Search size={18} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('playgrounds.discovery.searchPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.textPrimary }]}
                accessibilityLabel={t('playgrounds.discovery.searchLabel')}
                returnKeyType="search"
              />
            </View>

            <View
              style={[
                styles.resultsRow,
                { flexDirection: rtl ? 'row-reverse' : 'row' },
              ]}
            >
              <Text variant="bodySmall" weight="semibold" color={colors.textSecondary}>
                {resultCountLabel}
              </Text>

              <Pressable
                onPress={() => setFilterOpen(true)}
                style={({ pressed }) => [
                  styles.filterPill,
                  {
                    opacity: pressed ? 0.9 : 1,
                    borderColor: colors.accentOrange,
                    backgroundColor: colors.accentOrangeSoft,
                    flexDirection: rtl ? 'row-reverse' : 'row',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('playgrounds.discovery.filters')}
              >
                <SlidersHorizontal size={14} color={colors.accentOrange} />
                <Text variant="caption" weight="semibold" color={colors.accentOrange}>
                  {t('playgrounds.discovery.filters')}
                </Text>
              </Pressable>
            </View>
          </View>
        }
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
              message={venuesErrorMessage}
              onAction={listVenues}
            />
          ) : (
            <EmptyState
              title={t('playgrounds.explore.noVenuesTitle')}
              message={t('playgrounds.explore.noVenuesMessage')}
              actionLabel={t('playgrounds.explore.resetFilters')}
              onAction={handleResetFilters}
            />
          )
        }
        renderItem={renderVenueCard}
      />

      <VenuesFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        activities={activitiesList}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  headerShell: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerTitleRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  segmentWrap: {
    marginTop: spacing.xs,
  },
  segmentTrack: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  segmentItemActive: {
    borderWidth: 0,
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 48,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  resultsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterPill: {
    minHeight: 38,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  cardWrap: {
    marginBottom: spacing.lg,
  },
  skeletonWrap: {
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  skeletonCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
});
