import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowUpDown, SlidersHorizontal, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { Screen } from '../components/ui/Screen';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { BackButton } from '../components/ui/BackButton';
import { BottomSheetModal } from '../components/ui/BottomSheetModal';
import { useToast } from '../components/ui/ToastHost';

import { AcademyCard } from '../components/discovery/AcademyCard';
import { SegmentedViewToggle } from '../components/discovery/SegmentedViewToggle';
import { FilterSheet } from '../components/discovery/FilterSheet';
import { MapPeekCard } from '../components/discovery/MapPeekCard';
import { AcademyCardSkeleton } from '../components/discovery/AcademyCardSkeleton';
import { CompareBar } from '../components/discovery/CompareBar';
import { CompareModal } from '../components/discovery/CompareModal';

import {
  useAcademyDiscoveryActions,
  useAcademyDiscoveryStore,
} from '../services/academyDiscovery/academyDiscovery.store';
import {
  buildAppliedDiscoveryChips,
  DISCOVERY_COMPARE_LIMIT,
  removeDiscoveryChip,
} from '../services/academyDiscovery/discoveryFilters';
import { makeADTheme } from '../theme/academyDiscovery.styles';
import { API_BASE_URL } from '../services/api/client';

const TAB_BAR_GUARD_SPACE = 72;

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
}

const normalizeAcademy = (item) => item?.academy || item || null;

const toAbsoluteUrlMaybe = (url, base) => {
  if (!url) return null;
  const value = String(url).trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value;
  if (!base) return value;
  return `${base.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
};

const academyImageUrl = (base, slug, kind) => {
  if (!base || !slug) return null;
  return `${base.replace(/\/$/, '')}/public/academies/image/${encodeURIComponent(slug)}/${kind}`;
};

const getCompareIdFromItem = (item) => {
  const academy = normalizeAcademy(item);
  if (!academy) return null;
  return String(academy.id || academy.slug || item?.id || item?.slug || '');
};

const buildCompareEntry = (item, imageBaseUrl, t) => {
  const academy = normalizeAcademy(item);
  if (!academy) return null;

  const compareId = getCompareIdFromItem(item);
  if (!compareId) return null;

  const slug = academy.slug || item?.slug || null;

  const coverUri =
    toAbsoluteUrlMaybe(academy.cover_url, imageBaseUrl) ||
    (academy.cover_meta?.has ? academyImageUrl(imageBaseUrl, slug, 'cover') : null);

  const logoUri =
    toAbsoluteUrlMaybe(academy.logo_url, imageBaseUrl) ||
    (academy.logo_meta?.has ? academyImageUrl(imageBaseUrl, slug, 'logo') : null);

  return {
    compareId,
    slug,
    academy,
    name: academy.name_en || academy.name_ar || academy.name || t('service.academy.common.defaultName'),
    city: academy.city || academy.location || '',
    country: academy.country || '',
    sports: Array.isArray(academy.sport_types) ? academy.sport_types.filter(Boolean) : [],
    rating: academy.rating ?? academy.rating_avg ?? academy.ratingAvg ?? null,
    ratingCount: academy.rating_count ?? academy.ratingCount ?? null,
    isPro: !!academy.is_pro,
    isFeatured: !!academy.is_featured,
    regEnabled: !!academy.registration_enabled || !!academy.registration_open,
    canJoin: !!academy.registration_enabled && !!academy.registration_open,
    hasFacilities: !!academy.has_facilities_booking,
    feeAmount: academy.subscription_fee_amount,
    feeType: academy.subscription_fee_type || '',
    ageFrom: academy.ages_from ?? academy.age_from ?? null,
    ageTo: academy.ages_to ?? academy.age_to ?? null,
    distanceKm: item?.distance_km ?? item?.distanceKm ?? academy?.distance_km ?? null,
    coverUri,
    logoUri,
  };
};

function SortSheet({ visible, onClose, options, value, onSelect }) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <View style={[styles.sortContainer, { maxHeight: '60%' }]}> 
        <View style={[styles.sortHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <Text variant="h4" weight="bold">
            {t('service.academy.discovery.sort.title')}
          </Text>
          <Button variant="ghost" size="small" onPress={onClose}>
            {t('common.close')}
          </Button>
        </View>

        <View style={styles.sortOptions}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect?.(option.value);
                  onClose?.();
                }}
                style={({ pressed }) => [
                  styles.sortOption,
                  {
                    opacity: pressed ? 0.9 : 1,
                    borderColor: selected ? theme.accent.orange : theme.hairline,
                    backgroundColor: selected ? theme.accent.orangeSoft : theme.surface1,
                  },
                ]}
              >
                <Text
                  variant="bodySmall"
                  weight={selected ? 'bold' : 'medium'}
                  style={{ color: selected ? theme.accent.orange : theme.text.primary }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </BottomSheetModal>
  );
}

export function AcademyDiscoveryScreen({ initialView = 'list' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const { colors, isDark } = useTheme();
  const { t, isRTL, language } = useI18n();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  const {
    filters,
    sort,
    query,
    viewMode,
    academies,
    rawAcademies,
    mapAcademies,
    rawMapAcademies,
    listLoading,
    mapLoading,
    listError,
    mapError,
    refreshing,
    loadingMore,
    hasMore,
    filtersLoaded,
    selectedAcademy,
    locationStatus,
  } = useAcademyDiscoveryStore((state) => state);

  const actions = useAcademyDiscoveryActions();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [compareLookup, setCompareLookup] = useState({});

  const debouncedQuery = useDebouncedValue(query, 400);

  const mapMarkers = useMemo(
    () =>
      mapAcademies
        .map((item) => normalizeAcademy(item))
        .filter((academy) => academy?.slug && academy?.lat != null && academy?.lng != null),
    [mapAcademies]
  );

  useEffect(() => {
    actions.hydrateSavedFilters();
  }, [actions]);

  useEffect(() => {
    if (initialView) actions.setViewMode(initialView);
  }, [actions, initialView]);

  useEffect(() => {
    if (!filtersLoaded) return;
    actions.fetchAcademies({ page: 1, append: false, query: debouncedQuery });
  }, [actions, debouncedQuery, filters, filtersLoaded, sort]);

  useEffect(() => {
    if (!filtersLoaded || viewMode !== 'map') return;
    actions.fetchMapAcademies({ query: debouncedQuery });
  }, [actions, debouncedQuery, filters, filtersLoaded, sort, viewMode]);

  useEffect(() => {
    if (sort === 'nearest' && locationStatus === 'idle') {
      actions.requestLocation();
    }
  }, [actions, locationStatus, sort]);

  useEffect(() => {
    if (viewMode !== 'map') actions.setSelectedAcademy(null);
  }, [actions, viewMode]);

  useEffect(() => {
    if (!selectedAcademy) return;
    const exists = mapMarkers.some((academy) => academy?.slug === selectedAcademy?.slug);
    if (!exists) actions.setSelectedAcademy(null);
  }, [actions, mapMarkers, selectedAcademy]);

  useEffect(() => {
    if (!compareOpen) return;
    if (compareIds.length < 2) setCompareOpen(false);
  }, [compareIds.length, compareOpen]);

  useEffect(() => {
    if (!compareIds.length) return;

    const nextEntries = {};
    [...rawAcademies, ...academies, ...rawMapAcademies].forEach((item) => {
      const id = getCompareIdFromItem(item);
      if (!id || !compareIds.includes(id)) return;

      const entry = buildCompareEntry(item, API_BASE_URL, t);
      if (entry) nextEntries[id] = entry;
    });

    if (!Object.keys(nextEntries).length) return;
    setCompareLookup((prev) => ({ ...prev, ...nextEntries }));
  }, [academies, compareIds, rawAcademies, rawMapAcademies, t]);

  const sortOptions = useMemo(
    () => [
      { value: 'recommended', label: t('service.academy.discovery.sort.recommended') },
      { value: 'newest', label: t('service.academy.discovery.sort.newest') },
      { value: 'nearest', label: t('service.academy.discovery.sort.nearest') },
    ],
    [t]
  );

  const selectedSortLabel = useMemo(() => {
    const selected = sortOptions.find((entry) => entry.value === sort);
    return selected?.label || sortOptions[0]?.label || '';
  }, [sort, sortOptions]);

  const resultCountLabel = useMemo(() => {
    const count = viewMode === 'map' ? mapMarkers.length : academies.length;
    return t('service.academy.discovery.results', { count });
  }, [academies.length, mapMarkers.length, t, viewMode]);

  const activeChips = useMemo(
    () => buildAppliedDiscoveryChips({ t, query, filters, sort, language }),
    [filters, language, query, sort, t]
  );

  const compareItems = useMemo(
    () => compareIds.map((id) => compareLookup[id]).filter(Boolean),
    [compareIds, compareLookup]
  );

  const compareIdSet = useMemo(() => new Set(compareIds), [compareIds]);

  const compareBarVisible = viewMode === 'list' && compareItems.length >= 2;
  const compareBottomOffset = TAB_BAR_GUARD_SPACE + insets.bottom;

  const removeCompareItem = useCallback((id) => {
    setCompareIds((prev) => prev.filter((entry) => entry !== id));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    setCompareLookup({});
  }, []);

  const toggleCompare = useCallback(
    (item) => {
      const compareId = getCompareIdFromItem(item);
      if (!compareId) return;

      setCompareIds((prev) => {
        if (prev.includes(compareId)) {
          return prev.filter((entry) => entry !== compareId);
        }

        if (prev.length >= DISCOVERY_COMPARE_LIMIT) {
          toast.warning(
            t('service.academy.discovery.compare.limitReached', { count: DISCOVERY_COMPARE_LIMIT })
          );
          return prev;
        }

        return [...prev, compareId];
      });

      const entry = buildCompareEntry(item, API_BASE_URL, t);
      if (entry) {
        setCompareLookup((prev) => ({ ...prev, [entry.compareId]: entry }));
      }
    },
    [t, toast]
  );

  const removeChip = useCallback(
    (chipKey) => {
      const { nextFilters, nextQuery, nextSort } = removeDiscoveryChip({
        chipKey,
        filters,
        query,
        sort,
      });

      if (nextQuery !== query) {
        actions.setQuery(nextQuery);
      }

      if (nextSort !== sort) {
        actions.setSort(nextSort);
      }

      actions.setFilters(nextFilters);
    },
    [actions, filters, query, sort]
  );

  const onViewAcademy = useCallback(
    (academy) => {
      const slug = academy?.slug;
      if (slug) router.push(`/academies/${slug}`);
    },
    [router]
  );

  const onJoinAcademy = useCallback(
    (academy) => {
      const slug = academy?.slug;
      if (slug) router.push(`/academies/${slug}/join`);
    },
    [router]
  );

  const openComparedAcademy = useCallback(
    (item) => {
      const slug = item?.slug || item?.academy?.slug;
      if (!slug) return;
      setCompareOpen(false);
      router.push(`/academies/${slug}`);
    },
    [router]
  );

  const keyExtractor = useCallback((item, idx) => {
    const academy = normalizeAcademy(item);
    return String(academy?.id || academy?.slug || item?.id || item?.slug || idx);
  }, []);

  const renderAcademyItem = useCallback(
    ({ item }) => {
      const compareId = getCompareIdFromItem(item);
      return (
        <View style={styles.cardRowWrap}>
          <AcademyCard
            item={item}
            onPress={onViewAcademy}
            onJoin={onJoinAcademy}
            imageBaseUrl={API_BASE_URL}
            onToggleCompare={toggleCompare}
            isCompared={compareId ? compareIdSet.has(compareId) : false}
          />
        </View>
      );
    },
    [compareIdSet, onJoinAcademy, onViewAcademy, toggleCompare]
  );

  const listContentPaddingBottom = compareBarVisible
    ? compareBottomOffset + 98
    : theme.space['2xl'] + insets.bottom;

  const renderListState = () => {
    if (listLoading && academies.length === 0) {
      return (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.skeletonScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {Array.from({ length: 5 }).map((_, idx) => (
            <AcademyCardSkeleton key={`academy-skeleton-${idx}`} />
          ))}
        </ScrollView>
      );
    }

    if (listError) {
      return (
        <View style={styles.stateWrap}>
          <ErrorState
            title={t('service.academy.discovery.error.title')}
            message={listError}
            actionLabel={t('service.academy.discovery.error.tryAgain')}
            onAction={() => actions.fetchAcademies({ page: 1, append: false, query: debouncedQuery })}
          />
        </View>
      );
    }

    if (!academies.length) {
      return (
        <View style={styles.stateWrap}>
          <EmptyState
            title={t('service.academy.discovery.empty.title')}
            message={t('service.academy.discovery.empty.subtitle')}
            actionLabel={t('service.academy.discovery.empty.clearAll')}
            onAction={() => actions.clearFilters()}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={academies}
        keyExtractor={keyExtractor}
        renderItem={renderAcademyItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => actions.refresh({ query: debouncedQuery })}
            tintColor={theme.accent.orange}
          />
        }
        contentContainerStyle={{
          paddingTop: theme.space.md,
          paddingBottom: listContentPaddingBottom,
        }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => actions.fetchMore({ query: debouncedQuery })}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadMoreWrap}>
              <Button
                variant="secondary"
                style={styles.loadMoreButton}
                onPress={() => actions.fetchMore({ query: debouncedQuery })}
                disabled={loadingMore}
              >
                {loadingMore
                  ? t('service.academy.discovery.loading.title')
                  : t('service.academy.discovery.loadMore')}
              </Button>
            </View>
          ) : null
        }
      />
    );
  };

  return (
    <Screen safe scroll={false} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={[
          styles.headerShell,
          {
            borderBottomColor: theme.hairline,
            backgroundColor: theme.surface0,
            paddingHorizontal: theme.space.lg,
            paddingBottom: theme.space.md,
          },
        ]}
      >
        <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <BackButton />
          <View style={styles.titleCopy}>
            <Text variant="h3" weight="bold" style={{ color: theme.text.primary }}>
              {t('service.academy.discovery.title')}
            </Text>
            <Text variant="caption" color={theme.text.secondary}>
              {t('service.academy.discovery.subtitle')}
            </Text>
          </View>
        </View>

        <View style={[styles.searchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <View style={styles.searchInputWrap}>
            <Input
              value={query}
              onChangeText={actions.setQuery}
              placeholder={t('discovery.searchPlaceholder')}
              leftIcon="search"
              returnKeyType="search"
              style={{ marginBottom: 0 }}
            />
          </View>

          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => [
              styles.actionPill,
              {
                opacity: pressed ? 0.88 : 1,
                borderColor: theme.hairline,
                backgroundColor: theme.surface1,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <SlidersHorizontal size={14} color={theme.text.primary} />
            <Text variant="caption" weight="semibold" color={theme.text.primary}>
              {t('filters.title')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSortOpen(true)}
            style={({ pressed }) => [
              styles.actionPill,
              {
                opacity: pressed ? 0.88 : 1,
                borderColor: theme.hairline,
                backgroundColor: theme.surface1,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <ArrowUpDown size={14} color={theme.text.primary} />
            <Text variant="caption" weight="semibold" color={theme.text.primary} numberOfLines={1}>
              {selectedSortLabel}
            </Text>
          </Pressable>
        </View>

        <SegmentedViewToggle
          value={viewMode}
          onChange={actions.setViewMode}
          mapLabel={t('service.academy.discovery.view.map')}
          listLabel={t('service.academy.discovery.view.list')}
        />

        <View style={[styles.resultsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <Text variant="caption" weight="medium" color={theme.text.secondary}>
            {resultCountLabel}
          </Text>
        </View>

        {activeChips.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.chipsRow,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                paddingTop: theme.space.xs,
                paddingBottom: theme.space.xs,
              },
            ]}
          >
            {activeChips.map((chip) => (
              <Chip
                key={chip.key}
                label={chip.label}
                selected
                onPress={() => removeChip(chip.key)}
                rightIcon={<X size={12} color={theme.accent.orange} />}
                style={{
                  backgroundColor: theme.accent.orangeSoft,
                  borderColor: theme.accent.orange,
                }}
              />
            ))}
            <Chip label={t('filters.clearAll')} onPress={() => actions.clearFilters()} />
          </ScrollView>
        ) : null}
      </View>

      {viewMode === 'list' ? (
        renderListState()
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: mapMarkers[0]?.lat ? Number(mapMarkers[0].lat) : 31.9539,
              longitude: mapMarkers[0]?.lng ? Number(mapMarkers[0].lng) : 35.9106,
              latitudeDelta: 0.25,
              longitudeDelta: 0.25,
            }}
            showsUserLocation={false}
          >
            {mapMarkers.map((academy) => (
              <Marker
                key={academy.slug}
                coordinate={{ latitude: Number(academy.lat), longitude: Number(academy.lng) }}
                title={academy.name_en || academy.name_ar || academy.name}
                description={academy.city}
                onPress={() => actions.setSelectedAcademy(academy)}
              />
            ))}
          </MapView>

          {mapLoading ? (
            <View
              style={[
                styles.mapState,
                {
                  top: theme.space.lg,
                  left: theme.space.lg,
                  right: theme.space.lg,
                  borderColor: theme.hairline,
                  backgroundColor: theme.surface2,
                },
              ]}
            >
              <Text variant="bodySmall" color={theme.text.secondary}>
                {t('service.academy.map.loadingSubtitle')}
              </Text>
            </View>
          ) : mapError ? (
            <View
              style={[
                styles.mapState,
                {
                  top: theme.space.lg,
                  left: theme.space.lg,
                  right: theme.space.lg,
                  borderColor: theme.hairline,
                  backgroundColor: theme.surface2,
                },
              ]}
            >
              <ErrorState
                title={t('service.academy.map.error.title')}
                message={mapError}
                actionLabel={t('service.academy.map.error.tryAgain')}
                onAction={() => actions.fetchMapAcademies({ query: debouncedQuery })}
              />
            </View>
          ) : mapMarkers.length === 0 ? (
            <View
              style={[
                styles.mapState,
                {
                  top: theme.space.lg,
                  left: theme.space.lg,
                  right: theme.space.lg,
                  borderColor: theme.hairline,
                  backgroundColor: theme.surface2,
                },
              ]}
            >
              <EmptyState
                title={t('service.academy.map.empty.title')}
                message={t('service.academy.map.empty.subtitle')}
                actionLabel={t('service.academy.map.empty.reset')}
                onAction={() => actions.clearFilters()}
              />
            </View>
          ) : null}

          {selectedAcademy ? (
            <View
              style={[
                styles.peekWrap,
                {
                  left: theme.space.lg,
                  right: theme.space.lg,
                  bottom: theme.space.xl,
                },
              ]}
            >
              <MapPeekCard academy={selectedAcademy} onView={onViewAcademy} />
            </View>
          ) : null}
        </View>
      )}

      {compareBarVisible ? (
        <View
          style={[
            styles.compareBarWrap,
            {
              left: theme.space.lg,
              right: theme.space.lg,
              bottom: compareBottomOffset,
            },
          ]}
        >
          <CompareBar
            items={compareItems}
            onCompare={() => setCompareOpen(true)}
            onClear={clearCompare}
            onRemoveItem={removeCompareItem}
          />
        </View>
      ) : null}

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        resultCount={viewMode === 'map' ? mapMarkers.length : academies.length}
        onApply={(nextFilters) => {
          actions.setFilters(nextFilters);
          setFiltersOpen(false);
        }}
      />

      <SortSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={sortOptions}
        value={sort}
        onSelect={(value) => actions.setSort(value)}
      />

      <CompareModal
        visible={compareOpen}
        items={compareItems}
        onClose={() => setCompareOpen(false)}
        onRemoveItem={removeCompareItem}
        onOpenAcademy={openComparedAcademy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerShell: {
    borderBottomWidth: 1,
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  titleCopy: {
    flex: 1,
    gap: 2,
  },
  searchRow: {
    alignItems: 'flex-start',
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
  },
  actionPill: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    maxWidth: 150,
  },
  resultsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chipsRow: {
    alignItems: 'center',
    gap: 8,
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  skeletonScrollContent: {
    paddingHorizontal: 20,
    gap: 20,
    paddingTop: 16,
  },
  cardRowWrap: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  loadMoreWrap: {
    paddingHorizontal: 20,
  },
  loadMoreButton: {
    borderRadius: 14,
  },
  mapState: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  peekWrap: {
    position: 'absolute',
  },
  compareBarWrap: {
    position: 'absolute',
    zIndex: 16,
  },
  sortContainer: {
    width: '100%',
  },
  sortHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});

