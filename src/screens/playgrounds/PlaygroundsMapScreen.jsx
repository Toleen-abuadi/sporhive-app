import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  I18nManager,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { List, Map as MapIcon, Search, SlidersHorizontal } from 'lucide-react-native';

import { AppScreen } from '../../components/ui/AppScreen';
import { BackButton } from '../../components/ui/BackButton';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Text } from '../../components/ui/Text';
import { VenuesFilterSheet } from '../../components/playgrounds/VenuesFilterSheet';
import { LeafletMap } from '../../components/LeafletMap';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import {
  usePlaygroundsActions,
  usePlaygroundsStore,
} from '../../services/playgrounds/playgrounds.store';
import { useUserLocation } from '../../hooks/useUserLocation';
import { distanceKm, formatDistanceLabel } from '../../utils/distance';
import { DEFAULT_MAP_CENTER, averageCenter, normalizeLatLng } from '../../utils/map';
import { borderRadius, spacing } from '../../theme/tokens';
import { safeArray } from '../../utils/safeRender';

const LIST_ROUTE = '/playgrounds/explore';

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveVenuePosition = (venue) => {
  const candidates = [
    { lat: venue?.lat, lng: venue?.lng },
    { lat: venue?.latitude, lng: venue?.longitude },
    { lat: venue?.coords?.lat, lng: venue?.coords?.lng },
    { lat: venue?.coords?.latitude, lng: venue?.coords?.longitude },
    { lat: venue?.academy_profile?.lat, lng: venue?.academy_profile?.lng },
    { lat: venue?.academy_profile?.latitude, lng: venue?.academy_profile?.longitude },
    { lat: venue?.academy_profile?.location_lat, lng: venue?.academy_profile?.location_lng },
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const match = normalizeLatLng(candidates[index]);
    if (match) return match;
  }

  return null;
};

const resolveVenueTitle = (venue, fallbackLabel) =>
  venue?.name || venue?.title || fallbackLabel;

const resolveVenueLocation = (venue) =>
  venue?.base_location ||
  venue?.city ||
  venue?.location ||
  venue?.academy_profile?.location_text ||
  '';

const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);
  return debounced;
};

export function PlaygroundsMapScreen() {
  const { colors } = useTheme();
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

  const { userLocation, locationStatus, requestLocation } = useUserLocation({
    autoRequest: true,
  });

  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.baseLocation || '');
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(searchQuery, 350);
  const venuesList = useMemo(() => safeArray(venues), [venues]);
  const activitiesList = useMemo(() => safeArray(activities), [activities]);
  const venuesErrorMessage = venuesError?.message || venuesError;

  const listVenuesWithLocation = useCallback(async () => {
    const locationPayload = normalizeLatLng(userLocation);
    await listVenues(
      locationPayload
        ? {
            lat: locationPayload.lat,
            lng: locationPayload.lng,
          }
        : {}
    );
  }, [listVenues, userLocation]);

  useEffect(() => {
    hydrate();
    listActivities({ include_inactive: false });
  }, [hydrate, listActivities]);

  useEffect(() => {
    if (!filtersLoaded) return;
    listVenuesWithLocation();
  }, [filtersLoaded, listVenuesWithLocation]);

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
      await listVenuesWithLocation();
    };

    run();
  }, [applyFilters, debouncedSearch, filtersLoaded, listVenuesWithLocation, setFilters]);

  const mapVenues = useMemo(() => {
    return venuesList
      .map((venue) => {
        const id = venue?.id ?? venue?.slug;
        const position = resolveVenuePosition(venue);
        if (!id || !position) return null;

        const backendDistance = toNumberOrNull(
          venue?.distance_km ?? venue?.distanceKm ?? venue?.distance
        );
        const fallbackDistance = distanceKm(userLocation, position);
        const resolvedDistance = backendDistance ?? fallbackDistance ?? null;

        return {
          ...venue,
          id: String(id),
          position,
          distance_km: resolvedDistance,
          distanceKm: resolvedDistance,
        };
      })
      .filter(Boolean);
  }, [userLocation, venuesList]);

  const mapMarkers = useMemo(
    () =>
      mapVenues.map((venue) => ({
        id: venue.id,
        position: venue.position,
        title: resolveVenueTitle(
          venue,
          t('service.playgrounds.common.playground')
        ),
        description: resolveVenueLocation(venue),
      })),
    [mapVenues, t]
  );

  const mapCenter = useMemo(() => {
    const points = mapVenues.map((venue) => venue.position).filter(Boolean);
    const fallback = normalizeLatLng(userLocation) || DEFAULT_MAP_CENTER;
    return averageCenter(points, fallback);
  }, [mapVenues, userLocation]);

  const selectedVenue = useMemo(
    () =>
      mapVenues.find((venue) => String(venue.id) === String(selectedVenueId)) || null,
    [mapVenues, selectedVenueId]
  );

  const resultCountLabel = useMemo(
    () => t('playgrounds.discovery.count', { count: mapVenues.length }),
    [mapVenues.length, t]
  );

  const selectedDistanceLabel = useMemo(
    () => formatDistanceLabel(selectedVenue?.distance_km ?? selectedVenue?.distanceKm),
    [selectedVenue]
  );

  const handleMapMarkerPress = useCallback(
    (markerId) => {
      const match = mapVenues.find((venue) => String(venue.id) === String(markerId));
      if (!match) return;
      setSelectedVenueId(match.id);
      setSelectedVenue(match.id);
      setDetailsOpen(true);
    },
    [mapVenues, setSelectedVenue]
  );

  const handleApplyFilters = useCallback(
    async (nextFilters) => {
      setFilters(nextFilters);
      await applyFilters();
      await listVenuesWithLocation();
    },
    [applyFilters, listVenuesWithLocation, setFilters]
  );

  const handleResetFilters = useCallback(async () => {
    setSearchQuery('');
    await resetFilters();
    await listVenuesWithLocation();
  }, [listVenuesWithLocation, resetFilters]);

  const openVenueDetails = useCallback(() => {
    if (!selectedVenue?.id) return;
    setDetailsOpen(false);
    router.push(`/playgrounds/venue/${selectedVenue.id}`);
  }, [router, selectedVenue]);

  const openVenueBooking = useCallback(() => {
    if (!selectedVenue?.id) return;
    setDetailsOpen(false);
    router.push(`/playgrounds/book/${selectedVenue.id}`);
  }, [router, selectedVenue]);

  const showLocationWarning =
    locationStatus === 'denied' ||
    locationStatus === 'blocked' ||
    locationStatus === 'unavailable';

  return (
    <AppScreen noPadding contentStyle={styles.container}>
      <View style={styles.mapWrap}>
        <LeafletMap
          markers={mapMarkers}
          center={mapCenter}
          userLocation={userLocation}
          onMarkerPress={handleMapMarkerPress}
          zoom={12}
        />

        <View
          style={[
            styles.headerOverlay,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
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
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
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
                <MapIcon size={14} color={colors.white} />
                <Text variant="caption" weight="bold" color={colors.white}>
                  {t('playgrounds.discovery.map')}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push(LIST_ROUTE)}
                style={({ pressed }) => [
                  styles.segmentItem,
                  {
                    opacity: pressed ? 0.88 : 1,
                    flexDirection: rtl ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <List size={14} color={colors.textSecondary} />
                <Text variant="caption" weight="semibold" color={colors.textSecondary}>
                  {t('playgrounds.discovery.list')}
                </Text>
              </Pressable>
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

        {venuesLoading ? (
          <View style={styles.stateOverlay}>
            <View
              style={[
                styles.stateCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('service.playgrounds.explore.loading')}
              </Text>
            </View>
          </View>
        ) : venuesError ? (
          <View style={styles.stateOverlay}>
            <View style={styles.stateContainer}>
              <ErrorState
                title={t('playgrounds.explore.errorTitle')}
                message={venuesErrorMessage}
                onAction={listVenuesWithLocation}
              />
            </View>
          </View>
        ) : mapVenues.length === 0 ? (
          <View style={styles.stateOverlay}>
            <View style={styles.stateContainer}>
              <EmptyState
                title={t('playgrounds.explore.noVenuesTitle')}
                message={t('playgrounds.explore.noVenuesMessage')}
                actionLabel={t('playgrounds.explore.resetFilters')}
                onAction={handleResetFilters}
              />
            </View>
          </View>
        ) : null}

        {showLocationWarning && !venuesLoading && !venuesError ? (
          <View
            style={[
              styles.locationBanner,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          >
            <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
              {t(
                'playgrounds.map.locationDenied',
                'Location permission is unavailable. Showing default map center.'
              )}
            </Text>
            <Button variant="ghost" size="small" onPress={requestLocation}>
              {t('common.retry')}
            </Button>
          </View>
        ) : null}

      </View>

      <VenuesFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        activities={activitiesList}
        loadingActivities={activitiesLoading}
      />

      <BottomSheetModal
        visible={detailsOpen && !!selectedVenue}
        onClose={() => setDetailsOpen(false)}
      >
        {selectedVenue ? (
          <View style={styles.detailsSheet}>
            <Text variant="h4" weight="bold">
              {resolveVenueTitle(selectedVenue, t('service.playgrounds.common.playground'))}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {resolveVenueLocation(selectedVenue) || t('service.playgrounds.common.placeholder')}
            </Text>
            {selectedDistanceLabel ? (
              <Text variant="caption" color={colors.textSecondary}>
                {selectedDistanceLabel}
              </Text>
            ) : null}

            <View style={styles.detailsActions}>
              <Button variant="secondary" style={{ flex: 1 }} onPress={openVenueDetails}>
                {t('playgrounds.discovery.viewVenue', 'View venue')}
              </Button>
              <Button style={{ flex: 1 }} onPress={openVenueBooking}>
                {t('service.playgrounds.venue.cta.book')}
              </Button>
            </View>
          </View>
        ) : null}
      </BottomSheetModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrap: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
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
  stateOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  stateContainer: {
    width: '100%',
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailsSheet: {
    gap: spacing.sm,
  },
  detailsActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
