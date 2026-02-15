import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { SlidersHorizontal, X } from 'lucide-react-native';

import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { Screen } from '../components/ui/Screen';
import { AppHeader } from '../components/ui/AppHeader';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { BackButton } from '../components/ui/BackButton';

import { AcademyCard } from '../components/discovery/AcademyCard';
import { SearchBar } from '../components/discovery/SearchBar';
import { SegmentedViewToggle } from '../components/discovery/SegmentedViewToggle';
import { FilterSheet } from '../components/discovery/FilterSheet';
import { MapPeekCard } from '../components/discovery/MapPeekCard';
import { AcademyCardSkeleton } from '../components/discovery/AcademyCardSkeleton';

import {
  academyDiscoveryCapabilities,
  useAcademyDiscoveryActions,
  useAcademyDiscoveryStore,
} from '../services/academyDiscovery/academyDiscovery.store';
import { makeADTheme } from '../theme/academyDiscovery.styles';
import { API_BASE_URL } from '../services/api/client';

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const normalizeAcademy = (item) => item?.academy || item || null;

export function AcademyDiscoveryScreen({ initialView = 'list' }) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  const {
    filters,
    query,
    viewMode,
    academies,
    mapAcademies,
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

  const debouncedQuery = useDebouncedValue(query, 400);

  useEffect(() => {
    actions.hydrateSavedFilters();
  }, [actions]);

  useEffect(() => {
    if (initialView) {
      actions.setViewMode(initialView);
    }
  }, [actions, initialView]);

  useEffect(() => {
    if (!filtersLoaded) return;
    actions.fetchAcademies({ page: 1, append: false, query: debouncedQuery });
  }, [actions, debouncedQuery, filters, filtersLoaded]);

  useEffect(() => {
    if (!filtersLoaded) return;
    if (viewMode === 'map') {
      actions.fetchMapAcademies({ query: debouncedQuery });
    }
  }, [actions, debouncedQuery, filters, filtersLoaded, viewMode]);

  useEffect(() => {
    if (filters.sort === 'nearest' && locationStatus === 'idle') {
      actions.requestLocation();
    }
  }, [actions, filters.sort, locationStatus]);

  useEffect(() => {
    if (viewMode !== 'map') {
      actions.setSelectedAcademy(null);
    }
  }, [actions, viewMode]);

  useEffect(() => {
    if (!selectedAcademy) return;
    const exists = mapMarkers.some((academy) => academy?.slug === selectedAcademy?.slug);
    if (!exists) {
      actions.setSelectedAcademy(null);
    }
  }, [actions, mapMarkers, selectedAcademy]);

  const sortOptions = useMemo(
    () => [
      { value: 'recommended', label: t('service.academy.discovery.sort.recommended') },
      { value: 'nearest', label: t('service.academy.discovery.sort.nearest') },
    ],
    [t]
  );

  const mapMarkers = useMemo(() => {
    return mapAcademies
      .map((item) => normalizeAcademy(item))
      .filter((academy) => academy?.slug && academy?.lat != null && academy?.lng != null);
  }, [mapAcademies]);

  const resultCountLabel = useMemo(() => {
    const count = viewMode === 'map' ? mapMarkers.length : academies.length;
    return t('service.academy.discovery.results', { count });
  }, [academies.length, mapMarkers.length, t, viewMode]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (debouncedQuery) chips.push({ key: 'query', label: debouncedQuery });
    if (filters.age != null) {
      chips.push({
        key: 'age',
        label: t('service.academy.discovery.filters.ageChip', {
          age: filters.age,
          defaultValue: `Age: ${filters.age}`,
        }),
      });
    }
    if (filters.registrationEnabled) chips.push({ key: 'reg', label: t('service.academy.discovery.filters.registrationEnabled') });
    if (filters.proOnly) chips.push({ key: 'pro', label: t('service.academy.discovery.filters.proOnly') });
    if (filters.sort && filters.sort !== 'recommended') {
      chips.push({ key: 'sort', label: t(`service.academy.discovery.sort.${filters.sort}`) });
    }
    return chips;
  }, [debouncedQuery, filters.age, filters.proOnly, filters.registrationEnabled, filters.sort, t]);

  const removeChip = useCallback(
    (key) => {
      if (key === 'query') actions.setQuery('');
      if (key === 'age') actions.setFilters({ age: null });
      if (key === 'reg') actions.setFilters({ registrationEnabled: false });
      if (key === 'pro') actions.setFilters({ proOnly: false });
      if (key === 'sort') actions.setFilters({ sort: 'recommended' });
    },
    [actions]
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

  const listContent = useMemo(() => {
    if (listLoading && academies.length === 0) {
      return (
        <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.lg }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <AcademyCardSkeleton key={`skeleton-${idx}`} />
          ))}
        </View>
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
        keyExtractor={(item, idx) => String(item?.academy?.id || item?.id || idx)}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: theme.space.lg, marginBottom: theme.space.lg }}>
            <AcademyCard
              item={item}
              onPress={onViewAcademy}
              onJoin={onJoinAcademy}
              imageBaseUrl={API_BASE_URL}
            />
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => actions.refresh({ query: debouncedQuery })}
            tintColor={colors.accentOrange}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => actions.fetchMore({ query: debouncedQuery })}
        ListFooterComponent={
          hasMore ? (
            <View style={{ paddingHorizontal: theme.space.lg, marginBottom: theme.space['2xl'] }}>
              <Button
                variant="secondary"
                onPress={() => actions.fetchMore({ query: debouncedQuery })}
                disabled={loadingMore}
              >
                <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                  {loadingMore
                    ? t('service.academy.discovery.loading.title')
                    : t('service.academy.discovery.loadMore')}
                </Text>
              </Button>
            </View>
          ) : (
            <View style={{ height: theme.space['2xl'] }} />
          )
        }
        contentContainerStyle={{ paddingTop: theme.space.sm }}
        showsVerticalScrollIndicator={false}
      />
    );
  }, [
    academies,
    actions,
    colors.accentOrange,
    debouncedQuery,
    hasMore,
    listError,
    listLoading,
    loadingMore,
    onJoinAcademy,
    onViewAcademy,
    refreshing,
    t,
    theme.space,
    theme.text.primary,
  ]);

  return (
    <Screen safe scroll={false} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.headerWrap(theme)}>
        <AppHeader
          title={t('service.academy.discovery.title')}
          subtitle={t('service.academy.discovery.subtitle')}
          leftSlot={<BackButton />}
        />

        <SegmentedViewToggle
          value={viewMode}
          onChange={(value) => actions.setViewMode(value)}
          mapLabel={t('service.academy.discovery.view.map')}
          listLabel={t('service.academy.discovery.view.list')}
        />

        <SearchBar
          value={query}
          onChangeText={actions.setQuery}
          placeholder={t('service.academy.discovery.search.placeholder')}
        />

        <View style={styles.resultsRow(theme)}>
          <Text variant="caption" weight="medium" color={theme.text.secondary}>
            {resultCountLabel}
          </Text>
          <Button
            variant="primary"
            onPress={() => setFiltersOpen(true)}
            style={{ borderRadius: 20, paddingHorizontal: 16 }}
            leftIcon={<SlidersHorizontal size={16} color={theme.text.onDark} />}
          >
            {t('service.academy.discovery.filters.open')}
          </Button>
        </View>

        {activeChips.length ? (
          <View style={styles.chipsWrap(theme)}>
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
                  borderWidth: 1,
                  shadowColor: theme.black,
                  shadowOpacity: 0.12,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
              />
            ))}
          </View>
        ) : null}
      </View>

      {viewMode === 'list' ? (
        <>
          {activeChips.length > 0 && (
            <View
              style={{
                paddingHorizontal: theme.space.lg,
                paddingVertical: theme.space.sm,
                backgroundColor: theme.surface1,
                borderBottomWidth: 1,
                borderBottomColor: theme.hairline,
              }}
            >
              <Text variant="caption" weight="bold">
                {t('service.academy.discovery.filters.applied', {
                  count: activeChips.length,
                  defaultValue: `${activeChips.length} filters applied`,
                })}
              </Text>
            </View>
          )}
          {listContent}
        </>
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
            <View style={styles.mapState(theme)}>
              <Text variant="bodySmall" color={theme.text.secondary}>
                {t('service.academy.map.loadingSubtitle')}
              </Text>
            </View>
          ) : mapError ? (
            <View style={styles.mapState(theme)}>
              <ErrorState
                title={t('service.academy.map.error.title')}
                message={mapError}
                actionLabel={t('service.academy.map.error.tryAgain')}
                onAction={() => actions.fetchMapAcademies({ query: debouncedQuery })}
              />
            </View>
          ) : mapMarkers.length === 0 ? (
            <View style={styles.mapState(theme)}>
              <EmptyState
                title={t('service.academy.map.empty.title')}
                message={t('service.academy.map.empty.subtitle')}
                actionLabel={t('service.academy.map.empty.reset')}
                onAction={() => actions.clearFilters()}
              />
            </View>
          ) : null}

          {selectedAcademy ? (
            <View style={styles.peekWrap(theme)}>
              <MapPeekCard academy={selectedAcademy} onView={onViewAcademy} />
            </View>
          ) : null}
        </View>
      )}

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        sortOptions={sortOptions}
        capabilities={academyDiscoveryCapabilities}
        locationStatus={locationStatus}
        onRequestLocation={actions.requestLocation}
        onClear={() => {
          actions.clearFilters();
          setFiltersOpen(false);
        }}
        onApply={(nextFilters) => {
          actions.setFilters(nextFilters);
          setFiltersOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = {
  headerWrap: (theme) => ({
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.hairline,
    backgroundColor: theme.surface0,
  }),
  resultsRow: (theme) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.space.md,
  }),
  chipsWrap: (theme) => ({
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.xs,
    marginTop: theme.space.sm,
  }),
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mapState: (theme) => ({
    position: 'absolute',
    top: theme.space.lg,
    left: theme.space.lg,
    right: theme.space.lg,
    padding: theme.space.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.hairline,
  }),
  peekWrap: (theme) => ({
    position: 'absolute',
    left: theme.space.lg,
    right: theme.space.lg,
    bottom: theme.space.xl,
  }),
};
