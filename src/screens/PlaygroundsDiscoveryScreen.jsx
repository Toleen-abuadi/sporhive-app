import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { CalendarDays, Filter, RefreshCcw } from 'lucide-react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../components/ui/Screen';
import { AppHeader } from '../components/ui/AppHeader';
import { Input } from '../components/ui/Input';
import { Text } from '../components/ui/Text';
import { Chip } from '../components/ui/Chip';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Button } from '../components/ui/Button';
import { BottomSheetModal } from '../components/ui/BottomSheetModal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { InlineError } from '../components/ui/InlineError';
import { LoadingState } from '../components/ui/LoadingState';
import { PlaygroundCard } from '../components/playgrounds/PlaygroundCard';
import { endpoints } from '../services/api/endpoints';
import { API_BASE_URL } from '../services/api/client';
import { normalizeApiError } from '../services/api/normalizeApiError';
import {
  getBookingDraft,
  getPlaygroundsClientState,
  setBookingDraft,
  setPlaygroundsClientState,
} from '../services/playgrounds/storage';
import { useAuth } from '../services/auth/auth.store';
import { borderRadius, shadows, spacing } from '../theme/tokens';
import { safeArray } from '../utils/safeRender';

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [delay, value]);
  return debounced;
}

function normalizeImageUrl(uri) {
  if (!uri) return null;
  if (uri.startsWith('http')) return uri;
  const normalized = uri.startsWith('/') ? uri : `/${uri}`;
  return `${API_BASE_URL}${normalized}`;
}

function getVenueImages(venue) {
  const images = Array.isArray(venue.images) ? venue.images : venue.venue_images || [];
  return images
    .map((img) => img?.url || img?.path || img?.filename || '')
    .filter(Boolean)
    .map((uri) => normalizeImageUrl(uri))
    .filter(Boolean);
}

function resolveVenueImage(venue) {
  if (venue?.image) {
    return normalizeImageUrl(venue.image);
  }
  const images = getVenueImages(venue);
  if (images.length) return images[0];
  if (venue?.academy_profile?.hero_image) {
    return normalizeImageUrl(venue.academy_profile.hero_image);
  }
  return null;
}

function formatMoney(amount, currency) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${Number(amount).toFixed(0)}`;
}

function formatSlotLabel(slot) {
  const start = slot.start || slot.start_time || '';
  const end = slot.end || slot.end_time || '';
  if (!start && !end) return 'TBD';
  if (!end) return start;
  return `${start} - ${end}`;
}

function normalizeVenue(venue) {
  const name = venue.name || venue.title || 'Playground';
  const sport = venue.sport_type || venue.sport || 'Multi-sport';
  const location = venue.base_location || venue.academy_profile?.location_text || '';
  const ratingRaw = venue.avg_rating ?? 0;
  const rating = Number.isFinite(Number(ratingRaw)) ? Number(ratingRaw) : 0;
  const ratingCount = Number.isFinite(Number(venue.ratings_count)) ? Number(venue.ratings_count) : 0;
  const durations = Array.isArray(venue.durations)
    ? venue.durations
    : Array.isArray(venue.venue_durations)
    ? venue.venue_durations
    : [];
  const slots = venue.slots || venue.available_slots || [];
  const currency = venue.currency || durations?.[0]?.currency || slots?.[0]?.currency || null;
  let priceFrom = venue.price ?? null;
  if (priceFrom === null || priceFrom === undefined) {
    const durationPrices = durations
      .map((item) => Number(item?.base_price))
      .filter((value) => Number.isFinite(value));
    if (durationPrices.length) {
      priceFrom = Math.min(...durationPrices);
    }
  }

  return {
    name,
    sport,
    location,
    rating: ratingCount ? rating : 0,
    durations,
    slots,
    currency,
    priceFrom,
    imageUrl: resolveVenueImage(venue),
  };
}

export function PlaygroundsDiscoveryScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();

  const [query, setQuery] = useState('');
  const [activityId, setActivityId] = useState('');
  const [baseLocation, setBaseLocation] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('recommended');
  const [players, setPlayers] = useState('2');
  const [hasSpecialOffer, setHasSpecialOffer] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 400);
  const debouncedLocation = useDebouncedValue(baseLocation, 400);

  const [items, setItems] = useState([]);
  const [cachedItems, setCachedItems] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [selectedVenue, setSelectedVenue] = useState(null);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [slots, setSlots] = useState([]);
  const [durations, setDurations] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [bookingDraft, setBookingDraftState] = useState(null);
  const publicUser = session?.user || null;
  const [paymentType, setPaymentType] = useState('cash');
  const [sheetOpen, setSheetOpen] = useState(false);
  const slotsList = useMemo(() => safeArray(slots), [slots]);
  const durationsList = useMemo(() => safeArray(durations), [durations]);

  const filtersPayload = useMemo(() => {
    const numberOfPlayers = Number(players);
    return {
      activity_id: activityId || undefined,
      date: date || undefined,
      number_of_players: Number.isFinite(numberOfPlayers) && numberOfPlayers > 0 ? numberOfPlayers : 2,
      duration_id: selectedDuration?.id || undefined,
      base_location: debouncedLocation || undefined,
      academy_profile_id: undefined,
      has_special_offer: hasSpecialOffer ? true : undefined,
      order_by: sort === 'recommended' ? undefined : sort,
    };
  }, [activityId, date, debouncedLocation, hasSpecialOffer, players, selectedDuration?.id, sort]);

  const clientFilters = useMemo(
    () => ({
      ...filtersPayload,
      q: debouncedQuery || '',
    }),
    [debouncedQuery, filtersPayload]
  );

  const availableSports = useMemo(() => {
    const list = safeArray(activities).map((activity) => activity.name || '').filter(Boolean);
    return Array.from(new Set(list)).slice(0, 6);
  }, [activities]);

  const activityMap = useMemo(() => {
    return new Map(safeArray(activities).map((activity) => [String(activity.id), activity.name || '']));
  }, [activities]);

  const fetchPlaygrounds = useCallback(
    async (isRefresh = false) => {
      setError('');
      setLoading(!isRefresh);
      if (isRefresh) setRefreshing(true);
      try {
        const res = await endpoints.playgrounds.venuesList(filtersPayload);
        const list = Array.isArray(res?.data?.venues)
          ? res.data.venues
          : Array.isArray(res?.venues)
          ? res.venues
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
        const normalized = normalizeApiError(err);
        setError(normalized.message);
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
      const res = await endpoints.playgrounds.activitiesList({
        customer_id: publicUser?.id,
        include_inactive: false,
      });
      const list = Array.isArray(res?.activities)
        ? res.activities
        : Array.isArray(res?.data?.activities)
        ? res.data.activities
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setActivities(list);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized.message);
      setActivities([]);
    }
  }, [publicUser?.id]);

  const restorePersistedState = useCallback(async () => {
    const [client, draft] = await Promise.all([
      getPlaygroundsClientState(),
      getBookingDraft(),
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
      setItems(client.cachedResults);
      setCachedItems(client.cachedResults);
    }
    if (draft) {
      setBookingDraftState(draft);
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

  useEffect(() => {
    setBookingDraft(bookingDraft);
  }, [bookingDraft]);

  const onRefresh = useCallback(() => fetchPlaygrounds(true), [fetchPlaygrounds]);

  const openBookingSheet = useCallback(
    async (venue) => {
      if (!venue?.id) {
        setSlotError('Venue details are missing.');
        return;
      }
      const meta = normalizeVenue(venue);
      setSelectedVenue(venue);
      setSheetOpen(true);
      setSlots([]);
      setDurations([]);
      setSlotError('');
      setSlotLoading(true);
      try {
        const durationRes = await endpoints.playgrounds.venueDurations({ venue_id: venue.id });
        const durationsList = Array.isArray(durationRes?.data?.durations)
          ? durationRes.data.durations
          : Array.isArray(durationRes?.durations)
          ? durationRes.durations
          : [];
        const filteredDurations = durationsList.filter(
          (item) => item?.is_active && String(item?.venue) === String(venue.id)
        );
        setDurations(filteredDurations);

        const fallbackDuration = filteredDurations[0] || meta.durations?.[0] || null;
        const resolvedDuration = selectedDuration || fallbackDuration;
        setSelectedDuration(resolvedDuration);
        if (resolvedDuration) {
          setBookingDraftState((prev) => ({
            ...prev,
            duration: resolvedDuration,
            price: resolvedDuration.base_price ?? prev?.price ?? null,
            currency: resolvedDuration.currency ?? prev?.currency ?? null,
          }));
        }

        const durationMinutes =
          resolvedDuration?.minutes ||
          resolvedDuration?.duration_minutes ||
          fallbackDuration?.minutes ||
          fallbackDuration?.duration_minutes ||
          60;

        const slotRes = await endpoints.playgrounds.slots({
          venue_id: venue.id,
          date: date || undefined,
          duration_minutes: durationMinutes,
        });
        const list = Array.isArray(slotRes?.slots)
          ? slotRes.slots
          : Array.isArray(slotRes?.data?.slots)
          ? slotRes.data.slots
          : [];
        setSlots(list);
      } catch (err) {
        const normalized = normalizeApiError(err);
        setSlotError(normalized.message);
      } finally {
        setSlotLoading(false);
        setBookingDraftState((prev) => ({
          ...prev,
          venueId: venue.id,
          venueName: meta.name,
          date: date || prev?.date,
          currency: meta.currency || prev?.currency,
        }));
      }
    },
    [date, selectedDuration]
  );

  const handleSlotSelect = useCallback((slot) => {
    setBookingDraftState((prev) => ({
      ...prev,
      slot,
      price: slot.price ?? prev?.price ?? null,
      currency: slot.currency ?? prev?.currency ?? null,
    }));
  }, []);

  const handleDurationSelect = useCallback((duration) => {
    setSelectedDuration(duration);
    setBookingDraftState((prev) => ({
      ...prev,
      duration,
      price: duration.base_price ?? prev?.price ?? null,
      currency: duration.currency ?? prev?.currency ?? null,
    }));
  }, []);

  const handleBookNow = useCallback(async () => {
    if (!bookingDraft?.venueId || !bookingDraft?.slot || !bookingDraft?.date) return;
    const numberOfPlayers = Number(players) || 2;
    const currentUser = publicUser;

    if (!currentUser?.id) {
      setSlotError('Please sign in to complete booking.');
      return;
    }

    const formData = new FormData();
    if (selectedVenue?.academy_profile_id) {
      formData.append('academy_profile_id', String(selectedVenue.academy_profile_id));
    }
    if (selectedVenue?.activity_id) {
      formData.append('activity_id', String(selectedVenue.activity_id));
    }
    formData.append('user_id', String(currentUser.id));
    formData.append('venue_id', String(bookingDraft.venueId));
    if (bookingDraft.duration?.id) {
      formData.append('duration_id', String(bookingDraft.duration.id));
    }
    formData.append('booking_date', String(bookingDraft.date));
    formData.append('start_time', String(bookingDraft.slot.start_time || bookingDraft.slot.start || ''));
    formData.append('number_of_players', String(numberOfPlayers));
    formData.append('payment_type', paymentType);
    formData.append('cash_payment_on_date', paymentType === 'cash' ? 'true' : 'false');

    try {
      const res = await endpoints.playgrounds.createBooking(formData);
      const totalPrice = res?.total || res?.total_price;
      setBookingDraftState((prev) => ({
        ...prev,
        date: res?.date || res?.booking_date || prev?.date,
        price: totalPrice ? Number(totalPrice) : prev?.price,
      }));
      setSheetOpen(false);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setSlotError(normalized.message);
    }
  }, [
    bookingDraft,
    paymentType,
    players,
    publicUser,
    selectedVenue?.academy_profile_id,
    selectedVenue?.activity_id,
  ]);

  const draftVenue = useMemo(() => {
    if (!bookingDraft?.venueId) return null;
    return selectedVenue || items.find((item) => item.id === bookingDraft.venueId) || null;
  }, [bookingDraft?.venueId, items, selectedVenue]);

  const draftSummary = useMemo(() => {
    if (!bookingDraft?.venueName) return null;
    const slotLabel = bookingDraft.slot ? formatSlotLabel(bookingDraft.slot) : 'Pick a time';
    const durationLabel = bookingDraft.duration?.label || '';
    const price = formatMoney(bookingDraft.price, bookingDraft.currency);
    return { slotLabel, durationLabel, price };
  }, [bookingDraft]);

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
                {availableSports.length ? (
                  [
                    <Chip
                      key="all-activities"
                      label="All"
                      selected={!activityId}
                      onPress={() => setActivityId('')}
                    />,
                    ...availableSports.map((item) => (
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
            (item.activity_id ? activityMap.get(String(item.activity_id)) : '') || meta.sport;
          const priceLabel = formatMoney(meta.priceFrom, meta.currency);
          const pricePrefix =
            item.price === null || item.price === undefined ? 'From ' : '';
          return (
            <View style={styles.cardWrap}>
              <PlaygroundCard
                title={meta.name}
                location={meta.location}
                sport={activityName}
                imageUrl={meta.imageUrl}
                rating={meta.rating ?? undefined}
                priceLabel={priceLabel ? `${pricePrefix}${priceLabel}` : '—'}
                onPress={() => openBookingSheet(item)}
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

      {draftSummary ? (
        <View style={[styles.stickyBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {bookingDraft?.venueName}
            </Text>
            <Text variant="bodySmall" weight="semibold">
              {draftSummary.slotLabel}
              {draftSummary.durationLabel ? ` • ${draftSummary.durationLabel}` : ''}
            </Text>
          </View>
          <Button
            size="small"
            onPress={() => draftVenue && openBookingSheet(draftVenue)}
            accessibilityLabel="Review booking"
          >
            {draftSummary.price || 'Review'}
          </Button>
        </View>
      ) : null}

      <BottomSheetModal visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        {selectedVenue ? (
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text variant="h4" weight="semibold">
                {normalizeVenue(selectedVenue).name}
              </Text>
              <Button
                variant="ghost"
                size="small"
                onPress={() => setSheetOpen(false)}
                accessibilityLabel="Close booking sheet"
              >
                Close
              </Button>
            </View>
            <View style={styles.sheetSection}>
              <View style={styles.sectionTitle}>
                <CalendarDays size={16} color={colors.textMuted} />
                <Text variant="bodySmall" weight="semibold">
                  Select a slot
                </Text>
              </View>
              {slotLoading ? (
                <LoadingState message="Loading slots..." size="small" />
              ) : slotError ? (
                <InlineError
                  title="Slots unavailable"
                  subtitle={slotError}
                  onRetry={() => openBookingSheet(selectedVenue)}
                  actionLabel="Retry"
                />
              ) : slotsList.length ? (
                <View style={styles.slotGrid}>
                  {slotsList.map((slot) => (
                    <Chip
                      key={String(slot.id ?? formatSlotLabel(slot))}
                      label={formatSlotLabel(slot)}
                      selected={
                        bookingDraft?.slot?.id
                          ? bookingDraft?.slot?.id === slot.id
                          : formatSlotLabel(bookingDraft?.slot || {}) ===
                            formatSlotLabel(slot)
                      }
                      onPress={() => handleSlotSelect(slot)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  title="No slots found"
                  message="Try another date or check back later."
                />
              )}
            </View>

            <View style={styles.sheetSection}>
              <View style={styles.sectionTitle}>
                <RefreshCcw size={16} color={colors.textMuted} />
                <Text variant="bodySmall" weight="semibold">
                  Duration
                </Text>
              </View>
              {durationsList.length ? (
                <View style={styles.slotGrid}>
                  {durationsList.map((duration) => (
                    <Chip
                      key={String(duration.id ?? duration.label ?? duration.minutes)}
                      label={duration.label || `${duration.minutes || duration.duration_minutes || 60} min`}
                      selected={selectedDuration?.id === duration.id}
                      onPress={() => handleDurationSelect(duration)}
                    />
                  ))}
                </View>
              ) : (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  No durations listed. Booking will use the default duration.
                </Text>
              )}
            </View>

            {!publicUser ? (
              <Text variant="bodySmall" color={colors.textSecondary}>
                Sign in to your SporHive account to complete the booking.
              </Text>
            ) : null}

            <View style={styles.sheetSection}>
              <Text variant="bodySmall" weight="semibold">
                Payment type
              </Text>
              <View style={styles.slotGrid}>
                <Chip
                  label="Cash"
                  selected={paymentType === 'cash'}
                  onPress={() => setPaymentType('cash')}
                />
                <Chip
                  label="CliQ"
                  selected={paymentType === 'cliq'}
                  onPress={() => setPaymentType('cliq')}
                />
              </View>
              {paymentType === 'cliq' ? (
                <Text variant="caption" color={colors.textSecondary}>
                  Uploading CliQ proof is required at checkout.
                </Text>
              ) : null}
            </View>

            <View style={[styles.sheetFooter, { borderTopColor: colors.border }]}>
              <View>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Total
                </Text>
                <Text variant="h4" weight="bold">
                  {formatMoney(bookingDraft?.price, bookingDraft?.currency) || '--'}
                </Text>
              </View>
              <Button
                onPress={handleBookNow}
                disabled={!bookingDraft?.slot || !publicUser}
                accessibilityLabel="Book playground"
              >
                Book now
              </Button>
            </View>
          </View>
        ) : null}
      </BottomSheetModal>
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
  sheetContent: {
    gap: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sheetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
});
