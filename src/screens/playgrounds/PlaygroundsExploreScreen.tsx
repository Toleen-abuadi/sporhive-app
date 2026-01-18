import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Input } from '../../components/ui/Input';
import { Text } from '../../components/ui/Text';
import { Chip } from '../../components/ui/Chip';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { PlaygroundCard } from '../../components/playgrounds/PlaygroundCard';
import { endpoints } from '../../services/api/endpoints';
import { API_BASE_URL } from '../../services/api/client';
import {
  getBookingDraft,
  getPlaygroundsClientState,
  setPlaygroundsClientState,
} from '../../services/playgrounds/storage';
import { Activity, BookingDraftStorage, Venue } from '../../services/playgrounds/types';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [delay, value]);
  return debounced;
}

function getVenueImages(venue: Venue): string[] {
  const images = venue.images || venue.venue_images || [];
  return images
    .map((img) => img?.url || img?.path || '')
    .filter(Boolean)
    .map((uri) => {
      if (uri.startsWith('http')) return uri;
      const normalized = uri.startsWith('/') ? uri : `/${uri}`;
      return `${API_BASE_URL}${normalized}`;
    });
}

function resolveVenueImage(venue: Venue): string | null {
  const images = getVenueImages(venue);
  return images[0] || null;
}

function formatMoney(amount?: number | null, currency?: string | null) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${Number(amount).toFixed(0)}`;
}

function normalizeVenue(venue: Venue) {
  const name = venue.name || venue.title || 'Playground';
  const city = venue.city || '';
  const country = venue.country || '';
  const location = [city, country].filter(Boolean).join(', ');
  const ratingRaw = venue.rating ?? venue.avg_rating ?? null;
  const rating = ratingRaw !== null && ratingRaw !== undefined ? Number(ratingRaw) : null;
  const durations = venue.durations || venue.venue_durations || [];
  const slots = venue.slots || venue.available_slots || [];
  const currency = venue.currency || durations?.[0]?.currency || slots?.[0]?.currency || null;
  const priceFrom =
    venue.price_from ??
    venue.starting_price ??
    durations?.[0]?.price ??
    slots?.[0]?.price ??
    null;

  return {
    name,
    location,
    rating,
    currency,
    priceFrom,
    imageUrl: resolveVenueImage(venue),
  };
}

export function PlaygroundsExploreScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [activityId, setActivityId] = useState('');
  const [baseLocation, setBaseLocation] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState<'recommended' | 'price_asc' | 'rating_desc'>('recommended');
  const [players, setPlayers] = useState('2');
  const [hasSpecialOffer, setHasSpecialOffer] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 400);
  const debouncedLocation = useDebouncedValue(baseLocation, 400);

  const [items, setItems] = useState<Venue[]>([]);
  const [cachedItems, setCachedItems] = useState<Venue[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [resumeDraft, setResumeDraft] = useState<BookingDraftStorage | null>(null);

  const filtersPayload = useMemo(() => {
    const numberOfPlayers = Number(players);
    return {
      activity_id: activityId || undefined,
      date: date || undefined,
      number_of_players: Number.isFinite(numberOfPlayers) && numberOfPlayers > 0 ? numberOfPlayers : 2,
      base_location: debouncedLocation || undefined,
      has_special_offer: hasSpecialOffer ? true : undefined,
      order_by: sort === 'recommended' ? undefined : sort,
    };
  }, [activityId, date, debouncedLocation, hasSpecialOffer, players, sort]);

  const clientFilters = useMemo(
    () => ({
      ...filtersPayload,
      q: debouncedQuery || '',
    }),
    [debouncedQuery, filtersPayload]
  );

  const activityMap = useMemo(() => {
    return new Map(activities.map((activity) => [String(activity.id), activity.name || '']));
  }, [activities]);

  const availableActivities = useMemo(() => {
    const list = activities.map((activity) => activity.name || '').filter(Boolean);
    return Array.from(new Set(list)).slice(0, 6);
  }, [activities]);

  const fetchPlaygrounds = useCallback(
    async (isRefresh = false) => {
      setError('');
      setLoading(!isRefresh);
      if (isRefresh) setRefreshing(true);
      try {
        const res = await endpoints.playgrounds.venuesList(filtersPayload);
        const list = Array.isArray(res?.venues)
          ? res.venues
          : Array.isArray(res?.data?.venues)
          ? res.data.venues
          : Array.isArray(res?.data)
          ? res.data
          : [];
        const filteredList = debouncedQuery
          ? list.filter((venue) => {
              const name = `${venue.name || venue.title || ''}`.toLowerCase();
              return name.includes(debouncedQuery.toLowerCase());
            })
          : list;
        setItems(filteredList);
        setCachedItems(list);
        await setPlaygroundsClientState({
          filters: clientFilters,
          cachedAt: new Date().toISOString(),
          cachedResults: list,
        });
      } catch (err) {
        const message = err?.message || 'Unable to load playgrounds right now.';
        setError(message);
        if (cachedItems.length) {
          setItems(cachedItems);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cachedItems, clientFilters, debouncedQuery, filtersPayload]
  );

  const loadActivities = useCallback(async () => {
    try {
      const res = await endpoints.playgrounds.activitiesList({ include_inactive: false });
      const list = Array.isArray(res?.activities)
        ? res.activities
        : Array.isArray(res?.data?.activities)
        ? res.data.activities
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setActivities(list);
    } catch {
      setActivities([]);
    }
  }, []);

  const restorePersistedState = useCallback(async () => {
    const [client, draft] = await Promise.all([
      getPlaygroundsClientState(),
      getBookingDraft<BookingDraftStorage>(),
    ]);
    if (client?.filters) {
      setQuery(String(client.filters.q || ''));
      setActivityId(String(client.filters.activity_id || ''));
      setBaseLocation(String(client.filters.base_location || ''));
      setDate(String(client.filters.date || ''));
      const sortValue = String(client.filters.order_by || '');
      if (sortValue === 'rating_desc' || sortValue === 'price_asc') {
        setSort(sortValue);
      }
      if (client.filters.number_of_players) {
        setPlayers(String(client.filters.number_of_players));
      }
      if (client.filters.has_special_offer) {
        setHasSpecialOffer(Boolean(client.filters.has_special_offer));
      }
    }
    if (Array.isArray(client?.cachedResults)) {
      setItems(client.cachedResults as Venue[]);
      setCachedItems(client.cachedResults as Venue[]);
    }
    if (draft?.venueId) {
      setResumeDraft(draft);
    }
  }, []);

  useEffect(() => {
    restorePersistedState();
  }, [restorePersistedState]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    fetchPlaygrounds();
  }, [fetchPlaygrounds]);

  const onRefresh = useCallback(() => fetchPlaygrounds(true), [fetchPlaygrounds]);

  const sortOptions = useMemo(
    () => [
      { value: 'recommended', label: 'Recommended' },
      { value: 'rating_desc', label: 'Top Rated' },
      { value: 'price_asc', label: 'Lowest Price' },
    ],
    []
  );

  return (
    <Screen safe>
      <AppHeader title="Playgrounds" />
      <FlatList
        data={items}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <Input
              label="Search playgrounds"
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or sport"
              leftIcon="search"
              accessibilityLabel="Search playgrounds"
            />
            <View style={styles.row}>
              <Input
                label="Location"
                value={baseLocation}
                onChangeText={setBaseLocation}
                placeholder="City or area"
                leftIcon="map-pin"
                style={styles.rowInput}
                accessibilityLabel="Filter by location"
              />
              <Input
                label="Date"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                leftIcon="calendar"
                style={styles.rowInput}
                accessibilityLabel="Select booking date"
              />
            </View>
            <View style={styles.row}>
              <Input
                label="Players"
                value={players}
                onChangeText={setPlayers}
                placeholder="2"
                leftIcon="users"
                style={styles.rowInput}
                accessibilityLabel="Number of players"
                keyboardType="number-pad"
              />
              <View style={styles.rowInput}>
                <Text variant="bodySmall" weight="medium" style={styles.inlineLabel}>
                  Special offers
                </Text>
                <View style={styles.inlineChips}>
                  <Chip
                    label="Any"
                    selected={!hasSpecialOffer}
                    onPress={() => setHasSpecialOffer(false)}
                  />
                  <Chip
                    label="Only offers"
                    selected={hasSpecialOffer}
                    onPress={() => setHasSpecialOffer(true)}
                  />
                </View>
              </View>
            </View>
            <SegmentedControl value={sort} onChange={setSort} options={sortOptions} />
            <View style={styles.filtersRow}>
              <View style={styles.filtersTitle}>
                <Filter size={16} color={colors.textMuted} />
                <Text variant="bodySmall" weight="semibold">
                  Activities
                </Text>
              </View>
              <View style={styles.filtersChips}>
                {availableActivities.length ? (
                  [
                    <Chip
                      key="all-activities"
                      label="All"
                      selected={!activityId}
                      onPress={() => setActivityId('')}
                    />,
                    ...availableActivities.map((item) => (
                      <Chip
                        key={item}
                        label={item}
                        selected={activityMap.get(activityId) === item}
                        onPress={() => {
                          const id = activities.find((activity) => activity.name === item)?.id;
                          setActivityId(id ? String(id) : '');
                        }}
                      />
                    )),
                  ]
                ) : (
                  <Chip label="No filters yet" selected={false} />
                )}
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const meta = normalizeVenue(item);
          const activityName =
            (item.activity_id ? activityMap.get(String(item.activity_id)) : '') || 'Multi-sport';
          return (
            <View style={styles.cardWrap}>
              <PlaygroundCard
                title={meta.name}
                location={meta.location}
                sport={activityName}
                imageUrl={meta.imageUrl}
                rating={meta.rating ?? undefined}
                priceLabel={formatMoney(meta.priceFrom, meta.currency) || undefined}
                onPress={() => router.push(`/playgrounds/venue/${item.id}`)}
              />
            </View>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentOrange} />}
        ListEmptyComponent={
          loading ? (
            <LoadingState message="Loading available playgrounds..." />
          ) : error ? (
            <ErrorState
              title="Unable to load"
              message={error}
              onAction={() => fetchPlaygrounds()}
            />
          ) : (
            <EmptyState
              title="No playgrounds found"
              message="Try adjusting filters or selecting a new date."
            />
          )
        }
      />

      {resumeDraft?.venueId ? (
        <View style={[styles.stickyBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Resume booking
            </Text>
            <Text variant="bodySmall" weight="semibold">
              {resumeDraft.draft.bookingDate || 'Pick a date'} • Step {resumeDraft.draft.currentStep ?? 1}
            </Text>
          </View>
          <Button
            size="small"
            onPress={() => router.push(`/playgrounds/book/${resumeDraft.venueId}`)}
            accessibilityLabel="Resume booking"
          >
            Continue
          </Button>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 140,
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowInput: {
    flex: 1,
  },
  inlineLabel: {
    marginBottom: spacing.xs,
  },
  inlineChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filtersRow: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  filtersTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filtersChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  stickyBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    ...shadows.md,
  },
});
