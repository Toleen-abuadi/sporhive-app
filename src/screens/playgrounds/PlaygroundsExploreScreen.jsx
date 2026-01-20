import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, Filter, Flame, Star, Tag, Users } from 'lucide-react-native';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { VenueCard } from '../../components/playgrounds/VenueCard';
import { endpoints } from '../../services/api/endpoints';
import { API_BASE_URL } from '../../services/api/client';
import {
  clearPlaygroundsAuth,
  getPlaygroundsClientState,
  getPublicUser,
  getPublicUserMode,
  setPlaygroundsClientState,
} from '../../services/playgrounds/storage';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

const DEFAULT_FILTERS = {
  activityId: '',
  date: '',
  players: 2,
  baseLocation: '',
  hasSpecialOffer: false,
};

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

function resolvePriceLabel(venue, t) {
  const currency = venue.currency || 'AED';
  if (venue.price !== null && venue.price !== undefined) {
    const priceLabel = formatMoney(venue.price, currency);
    return priceLabel ? `${priceLabel}` : t('service.playgrounds.common.placeholder');
  }
  const durations = Array.isArray(venue.durations)
    ? venue.durations
    : Array.isArray(venue.venue_durations)
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
    ? t('service.playgrounds.common.fromPrice', { price: label })
    : t('service.playgrounds.common.placeholder');
}

export function PlaygroundsExploreScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [publicUserMode, setPublicUserMode] = useState(null);
  const [publicUser, setPublicUser] = useState(null);
  const [playgroundsClientState, setPlaygroundsClientStateLocal] = useState(null);

  const debouncedSearch = useDebouncedValue(searchQuery, 350);
  const underlineAnim = useRef(new Animated.Value(0)).current;
  const tabWidth = useRef(0);

  const columns = useMemo(() => {
    if (Platform.OS === 'web' || width >= 768) {
      return viewMode === 'grid' ? 2 : 1;
    }
    return 1;
  }, [viewMode, width]);

  const activityMap = useMemo(() => {
    return new Map(activities.map((activity) => [String(activity.id), activity.name || '']));
  }, [activities]);

  const categoryItems = useMemo(() => {
    const icons = [Star, Flame, Tag, Users];
    return activities.slice(0, 8).map((activity, index) => ({
      id: String(activity.id),
      label: activity.name || t('service.playgrounds.explore.activityFallback'),
      Icon: icons[index % icons.length],
    }));
  }, [activities, t]);

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }, []);

  const loadInitialState = useCallback(async () => {
    const [mode, user, clientState] = await Promise.all([
      getPublicUserMode(),
      getPublicUser(),
      getPlaygroundsClientState(),
    ]);
    setPublicUserMode(mode);
    setPublicUser(user);
    setPlaygroundsClientStateLocal(clientState || null);

    if (clientState?.filters) {
      const restored = {
        ...DEFAULT_FILTERS,
        activityId: String(clientState.filters.activity_id || ''),
        date: String(clientState.filters.date || ''),
        baseLocation: String(clientState.filters.base_location || ''),
        players: Number(clientState.filters.number_of_players || 2),
        hasSpecialOffer: Boolean(clientState.filters.has_special_offer || false),
      };
      setFilters(restored);
      setAppliedFilters(restored);
    }
  }, []);

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

  const buildPayload = useCallback(
    (filtersState) => {
      const numberOfPlayers = filtersState.players || 2;
      return {
        activity_id: filtersState.activityId || undefined,
        date: filtersState.date || undefined,
        number_of_players: numberOfPlayers,
        duration_id: undefined,
        base_location: filtersState.baseLocation || undefined,
        academy_profile_id: undefined,
        has_special_offer: activeTab === 'offers' ? true : filtersState.hasSpecialOffer || undefined,
        order_by: activeTab === 'offers' ? 'rating_desc' : undefined,
      };
    },
    [activeTab]
  );

  const fetchVenues = useCallback(
    async (filtersState) => {
      setError('');
      setVenuesLoading(true);
      try {
        const res = await endpoints.playgrounds.venuesList(buildPayload(filtersState));
        const list = Array.isArray(res?.data?.venues)
          ? res.data.venues
          : Array.isArray(res?.venues)
          ? res.venues
          : [];
        const normalizedList = debouncedSearch
          ? list.filter((venue) => {
              const name = `${venue.name || venue.title || ''}`.toLowerCase();
              const location = `${venue.base_location || venue?.academy_profile?.location_text || ''}`.toLowerCase();
              return name.includes(debouncedSearch.toLowerCase()) || location.includes(debouncedSearch.toLowerCase());
            })
          : list;
        setVenues(normalizedList);
        await setPlaygroundsClientState({
          filters: {
            activity_id: filtersState.activityId || '',
            date: filtersState.date || '',
            number_of_players: filtersState.players || 2,
            base_location: filtersState.baseLocation || '',
            has_special_offer: filtersState.hasSpecialOffer || false,
          },
          cachedAt: new Date().toISOString(),
          cachedResults: list,
        });
      } catch (err) {
        setError(err?.message || t('service.playgrounds.explore.errors.load'));
      } finally {
        setVenuesLoading(false);
        setRefreshing(false);
      }
    },
    [buildPayload, debouncedSearch, t]
  );

  useEffect(() => {
    loadInitialState();
    loadActivities();
  }, [loadActivities, loadInitialState]);

  useEffect(() => {
    fetchVenues(appliedFilters);
  }, [appliedFilters, activeTab, fetchVenues]);

  useEffect(() => {
    const target = activeTab === 'all' ? 0 : 1;
    Animated.timing(underlineAnim, {
      toValue: target,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [activeTab, underlineAnim]);

  useEffect(() => {
    setViewMode(Platform.OS === 'web' || width >= 768 ? 'grid' : 'list');
  }, [width]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVenues(appliedFilters);
  }, [appliedFilters, fetchVenues]);

  const handleLogout = useCallback(async () => {
    await clearPlaygroundsAuth();
    setPublicUser(null);
    setPublicUserMode(null);
    router.replace('/playgrounds/auth');
  }, [router]);

  const underlineStyle = {
    transform: [
      {
        translateX: underlineAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, tabWidth.current],
        }),
      },
    ],
  };

  return (
    <Screen safe>
      <AppHeader
        title={t('service.playgrounds.explore.title')}
        rightIcon={publicUser?.id ? 'log-out' : null}
        onRightPress={publicUser?.id ? handleLogout : undefined}
      />
      <View style={styles.stickyHeader}>
        <Input
          label={t('service.playgrounds.explore.search.label')}
          value={searchQuery}
          onChangeText={(value) => {
            setSearchQuery(value);
            setFilters((prev) => ({ ...prev, baseLocation: value }));
          }}
          placeholder={t('service.playgrounds.explore.search.placeholder')}
          leftIcon="search"
          accessibilityLabel={t('service.playgrounds.explore.search.accessibilityLabel')}
        />
        <View style={styles.headerRow}>
          <Button
            variant="secondary"
            size="small"
            onPress={applyFilters}
            accessibilityLabel={t('service.playgrounds.explore.filters.applyAccessibility')}
          >
            {t('service.playgrounds.explore.filters.button')}
          </Button>
          <View style={styles.quickChips}>
            <Chip
              label={
                filters.date
                  ? t('service.playgrounds.explore.filters.dateSelected', { date: filters.date })
                  : t('service.playgrounds.explore.filters.pickDate')
              }
              selected={!!filters.date}
              onPress={() =>
                setFilters((prev) => ({
                  ...prev,
                  date: prev.date ? '' : new Date().toISOString().slice(0, 10),
                }))
              }
              icon={<CalendarDays size={12} color={colors.textMuted} />}
            />
            <Chip
              label={t('service.playgrounds.explore.filters.players', { count: filters.players || 2 })}
              selected
              onPress={() => setFilters((prev) => ({ ...prev, players: (prev.players || 2) + 1 }))}
              icon={<Users size={12} color={colors.textMuted} />}
            />
            <Chip
              label={t('service.playgrounds.explore.filters.offers')}
              selected={filters.hasSpecialOffer}
              onPress={() => setFilters((prev) => ({ ...prev, hasSpecialOffer: !prev.hasSpecialOffer }))}
              icon={<Tag size={12} color={colors.textMuted} />}
            />
          </View>
        </View>
        <View style={styles.categoriesRow}>
          {categoryItems.map(({ id, label, Icon }) => (
            <Chip
              key={id}
              label={label}
              selected={filters.activityId === id}
              onPress={() => setFilters((prev) => ({ ...prev, activityId: prev.activityId === id ? '' : id }))}
              icon={<Icon size={12} color={colors.textMuted} />}
            />
          ))}
        </View>
        <View
          style={[styles.tabsRow, { borderBottomColor: colors.border }]}
          onLayout={(event) => {
            tabWidth.current = event.nativeEvent.layout.width / 2;
          }}
        >
          <Button
            variant="ghost"
            size="small"
            onPress={() => setActiveTab('all')}
            accessibilityLabel={t('service.playgrounds.explore.tabs.allAccessibility')}
          >
            {t('service.playgrounds.explore.tabs.all')}
          </Button>
          <Button
            variant="ghost"
            size="small"
            onPress={() => setActiveTab('offers')}
            accessibilityLabel={t('service.playgrounds.explore.tabs.offersAccessibility')}
          >
            {t('service.playgrounds.explore.tabs.offers')}
          </Button>
          <Animated.View
            style={[
              styles.tabsUnderline,
              { backgroundColor: colors.accentOrange, width: tabWidth.current },
              underlineStyle,
            ]}
          />
        </View>
      </View>

      {venuesLoading ? (
        <SporHiveLoader message={t('service.playgrounds.explore.loading')} />
      ) : error ? (
        <ErrorState
          title={t('service.playgrounds.explore.errors.title')}
          message={error}
          onAction={() => fetchVenues(appliedFilters)}
        />
      ) : venues.length ? (
        <FlatList
          data={venues}
          key={`${columns}-${viewMode}`}
          keyExtractor={(item, index) => String(item.id ?? index)}
          numColumns={columns}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={columns > 1 ? styles.columnWrap : undefined}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentOrange} />}
          renderItem={({ item }) => {
            const imageUrl = resolveVenueImage(item);
            const ratingRaw = item.avg_rating ?? 0;
            const rating = Number.isFinite(Number(ratingRaw)) ? Number(ratingRaw) : 0;
            const ratingCount = Number.isFinite(Number(item.ratings_count)) ? Number(item.ratings_count) : 0;
            const activityLabel = item.activity_id
              ? activityMap.get(String(item.activity_id))
              : t('service.playgrounds.common.multiSport');
            const discountLabel =
              item.special_offer_note || item.academy_profile?.special_offers_note || null;
            const priceLabel = resolvePriceLabel(item, t);
            const locationText =
              item.base_location || item.academy_profile?.location_text || '';

            return (
              <View style={[styles.cardWrap, columns > 1 && styles.cardWrapGrid]}>
                <VenueCard
                  title={item.name || item.title || t('service.playgrounds.common.playground')}
                  location={locationText}
                  imageUrl={imageUrl}
                  rating={ratingCount ? rating : 0}
                  hasOffer={!!item.has_special_offer}
                  discountLabel={discountLabel}
                  priceLabel={priceLabel}
                  activityLabel={activityLabel || undefined}
                  onPress={() => {
                    const id = String(item.id || '');
                    setSelectedVenueId(id);
                    router.push(`/playgrounds/venue/${id}`);
                  }}
                />
              </View>
            );
          }}
        />
      ) : (
        <EmptyState
          title={t('service.playgrounds.explore.empty.title')}
          message={t('service.playgrounds.explore.empty.message')}
          actionLabel={t('service.playgrounds.explore.empty.action')}
          onAction={resetFilters}
        />
      )}

      {Platform.OS !== 'web' ? (
        <View style={[styles.bottomTabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Button
            variant="ghost"
            size="small"
            accessibilityLabel={t('service.playgrounds.nav.explore')}
            onPress={() => router.push('/playgrounds/explore')}
          >
            {t('service.playgrounds.nav.explore')}
          </Button>
          <Button
            variant="ghost"
            size="small"
            accessibilityLabel={t('service.playgrounds.nav.bookings')}
            onPress={() => router.push('/playgrounds/bookings')}
          >
            {t('service.playgrounds.nav.bookings')}
          </Button>
          <Button
            variant="ghost"
            size="small"
            accessibilityLabel={t('service.playgrounds.nav.offers')}
            onPress={() => setActiveTab('offers')}
          >
            {t('service.playgrounds.nav.offers')}
          </Button>
          <Button
            variant="ghost"
            size="small"
            accessibilityLabel={t('service.playgrounds.nav.profile')}
            onPress={() => router.push('/playgrounds/auth')}
          >
            {t('service.playgrounds.nav.profile')}
          </Button>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  quickChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    flex: 1,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
  },
  tabsUnderline: {
    position: 'absolute',
    height: 2,
    bottom: 0,
    left: 0,
    borderRadius: borderRadius.full,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  columnWrap: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardWrap: {
    marginBottom: spacing.lg,
  },
  cardWrapGrid: {
    flex: 1,
    marginRight: spacing.lg,
  },
  bottomTabs: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    ...shadows.md,
  },
});
