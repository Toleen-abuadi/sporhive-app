import { useEffect, useMemo, useState } from 'react';
import {
  academyDiscoveryApi,
  academyDiscoveryFilters,
  ACADEMY_DISCOVERY_PAGE_SIZE,
} from '../api/academyDiscovery.api';
import { getAcademyDiscoveryState, setAcademyDiscoveryState } from './storage';
import {
  applyDiscoveryFilters,
  DEFAULT_DISCOVERY_FILTERS,
  DEFAULT_DISCOVERY_SORT,
  normalizeDiscoveryFilters,
  normalizeDiscoverySort,
} from './discoveryFilters';

const INITIAL_STATE = {
  filters: { ...DEFAULT_DISCOVERY_FILTERS },
  sort: DEFAULT_DISCOVERY_SORT,
  filtersLoaded: false,
  query: '',
  viewMode: 'list',
  rawAcademies: [],
  academies: [],
  rawMapAcademies: [],
  mapAcademies: [],
  listLoading: false,
  mapLoading: false,
  listError: null,
  mapError: null,
  refreshing: false,
  loadingMore: false,
  page: 1,
  hasMore: true,
  selectedAcademy: null,
  coords: null,
  locationStatus: 'idle',
  detailsBySlug: {},
  detailsLoadingBySlug: {},
  detailsErrorBySlug: {},
};

let discoveryState = { ...INITIAL_STATE };
const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener(discoveryState));
};

const setState = (patch) => {
  discoveryState = { ...discoveryState, ...patch };
  emit();
};

const setDetailsState = (slug, patch) => {
  discoveryState = {
    ...discoveryState,
    detailsBySlug: {
      ...discoveryState.detailsBySlug,
      ...(patch?.data ? { [slug]: patch.data } : {}),
    },
    detailsLoadingBySlug: {
      ...discoveryState.detailsLoadingBySlug,
      ...(patch?.loading !== undefined ? { [slug]: patch.loading } : {}),
    },
    detailsErrorBySlug: {
      ...discoveryState.detailsErrorBySlug,
      ...(patch?.error !== undefined ? { [slug]: patch.error } : {}),
    },
  };
  emit();
};

const applyCurrentClientFilters = ({ rawAcademies, rawMapAcademies, query, filters, sort }) => ({
  academies: applyDiscoveryFilters(rawAcademies, { query, filters, sort }),
  mapAcademies: applyDiscoveryFilters(rawMapAcademies, { query, filters, sort }),
});

const persistState = async () => {
  const payload = {
    filters: discoveryState.filters,
    sort: discoveryState.sort,
    query: discoveryState.query,
    viewMode: discoveryState.viewMode,
  };
  await setAcademyDiscoveryState(payload);
};

export const academyDiscoveryStore = {
  getState: () => discoveryState,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async hydrateSavedFilters() {
    const stored = await getAcademyDiscoveryState();
    if (!stored) {
      setState({ filtersLoaded: true });
      return;
    }

    const rawStoredFilters = stored.filters || {};
    const nextFilters = normalizeDiscoveryFilters(rawStoredFilters);
    const nextSort = normalizeDiscoverySort(stored.sort ?? rawStoredFilters.sort);
    const nextQuery = stored.query || '';

    const nextClientData = applyCurrentClientFilters({
      rawAcademies: discoveryState.rawAcademies,
      rawMapAcademies: discoveryState.rawMapAcademies,
      query: nextQuery,
      filters: nextFilters,
      sort: nextSort,
    });

    setState({
      filters: nextFilters,
      sort: nextSort,
      query: nextQuery,
      viewMode: stored.viewMode || 'list',
      ...nextClientData,
      filtersLoaded: true,
    });
  },
  setQuery(query) {
    const nextQuery = query ?? '';
    const nextClientData = applyCurrentClientFilters({
      rawAcademies: discoveryState.rawAcademies,
      rawMapAcademies: discoveryState.rawMapAcademies,
      query: nextQuery,
      filters: discoveryState.filters,
      sort: discoveryState.sort,
    });

    setState({
      query: nextQuery,
      ...nextClientData,
    });
  },
  setFilters(partialOrValue) {
    const merged =
      typeof partialOrValue === 'function'
        ? partialOrValue(discoveryState.filters)
        : { ...discoveryState.filters, ...(partialOrValue || {}) };

    const nextFilters = normalizeDiscoveryFilters(merged);
    const nextClientData = applyCurrentClientFilters({
      rawAcademies: discoveryState.rawAcademies,
      rawMapAcademies: discoveryState.rawMapAcademies,
      query: discoveryState.query,
      filters: nextFilters,
      sort: discoveryState.sort,
    });

    setState({
      filters: nextFilters,
      ...nextClientData,
    });
  },
  setSort(sort) {
    const nextSort = normalizeDiscoverySort(sort);
    const nextClientData = applyCurrentClientFilters({
      rawAcademies: discoveryState.rawAcademies,
      rawMapAcademies: discoveryState.rawMapAcademies,
      query: discoveryState.query,
      filters: discoveryState.filters,
      sort: nextSort,
    });

    setState({
      sort: nextSort,
      ...nextClientData,
    });
  },
  async clearFilters() {
    const nextFilters = { ...DEFAULT_DISCOVERY_FILTERS };
    const nextSort = DEFAULT_DISCOVERY_SORT;
    const nextQuery = '';

    const nextClientData = applyCurrentClientFilters({
      rawAcademies: discoveryState.rawAcademies,
      rawMapAcademies: discoveryState.rawMapAcademies,
      query: nextQuery,
      filters: nextFilters,
      sort: nextSort,
    });

    setState({
      filters: nextFilters,
      sort: nextSort,
      query: nextQuery,
      ...nextClientData,
    });
    await persistState();
  },
  async setViewMode(mode) {
    if (!mode) return;
    setState({ viewMode: mode });
    await persistState();
  },
  setSelectedAcademy(academy) {
    setState({ selectedAcademy: academy || null });
  },
  setCoords(coords) {
    setState({ coords: coords || null });
  },
  setLocationStatus(status) {
    setState({ locationStatus: status || 'idle' });
  },
  async requestLocation() {
    if (!global?.navigator?.geolocation?.getCurrentPosition) {
      setState({ locationStatus: 'error' });
      return;
    }

    setState({ locationStatus: 'asking' });
    global.navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          locationStatus: 'granted',
        });
      },
      () => {
        setState({ locationStatus: 'denied' });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 }
    );
  },
  async fetchAcademies({ page = 1, append = false, query } = {}) {
    const effectiveQuery = query ?? discoveryState.query;
    const isFirstPage = page === 1 && !append;

    if (isFirstPage) {
      setState({ listLoading: true, listError: null, page: 1, hasMore: true });
    } else {
      setState({ loadingMore: true, listError: null });
    }

    try {
      const res = await academyDiscoveryApi.listAcademies({
        filters: discoveryState.filters,
        sort: discoveryState.sort,
        query: effectiveQuery,
        page,
        pageSize: ACADEMY_DISCOVERY_PAGE_SIZE,
        coords: discoveryState.coords,
      });

      const pageItems = Array.isArray(res?.items) ? res.items : [];
      const rawAcademies = append ? [...discoveryState.rawAcademies, ...pageItems] : pageItems;

      const academies = applyDiscoveryFilters(rawAcademies, {
        query: effectiveQuery,
        filters: discoveryState.filters,
        sort: discoveryState.sort,
      });

      const hasMore = pageItems.length >= ACADEMY_DISCOVERY_PAGE_SIZE;

      setState({
        rawAcademies,
        academies,
        listLoading: false,
        loadingMore: false,
        listError: null,
        hasMore,
        page,
      });

      await persistState();
      return { success: true, data: pageItems };
    } catch (error) {
      setState({
        listLoading: false,
        loadingMore: false,
        listError: error?.message || 'Unable to load academies.',
      });
      return { success: false, error };
    }
  },
  async fetchMapAcademies({ query } = {}) {
    const effectiveQuery = query ?? discoveryState.query;
    setState({ mapLoading: true, mapError: null });

    try {
      const res = await academyDiscoveryApi.listMapAcademies({
        filters: discoveryState.filters,
        sort: discoveryState.sort,
        query: effectiveQuery,
        coords: discoveryState.coords,
      });

      const rawMapItems = Array.isArray(res?.items) ? res.items : [];
      const mapAcademies = applyDiscoveryFilters(rawMapItems, {
        query: effectiveQuery,
        filters: discoveryState.filters,
        sort: discoveryState.sort,
      });

      setState({
        rawMapAcademies: rawMapItems,
        mapAcademies,
        mapLoading: false,
        mapError: null,
      });

      await persistState();
      return { success: true, data: rawMapItems };
    } catch (error) {
      setState({
        mapLoading: false,
        mapError: error?.message || 'Unable to load map.',
      });
      return { success: false, error };
    }
  },
  async refresh({ query } = {}) {
    setState({ refreshing: true });
    try {
      await academyDiscoveryStore.fetchAcademies({ page: 1, append: false, query });
    } finally {
      setState({ refreshing: false });
    }
  },
  async fetchMore({ query } = {}) {
    if (discoveryState.loadingMore || discoveryState.listLoading || !discoveryState.hasMore) return;
    const nextPage = discoveryState.page + 1;
    await academyDiscoveryStore.fetchAcademies({ page: nextPage, append: true, query });
  },
  async fetchDetails(slug) {
    if (!slug) return { success: false, error: new Error('Missing academy slug') };

    const cached = discoveryState.detailsBySlug[slug];
    if (cached) {
      return { success: true, data: cached, cached: true };
    }

    setDetailsState(slug, { loading: true, error: null });
    try {
      const data = await academyDiscoveryApi.getAcademyDetails(slug);
      if (!data?.academy) {
        throw new Error('Academy not found');
      }
      setDetailsState(slug, { loading: false, error: null, data });
      return { success: true, data };
    } catch (error) {
      setDetailsState(slug, { loading: false, error: error?.message || 'Unable to load academy.' });
      return { success: false, error };
    }
  },
};

export const academyDiscoveryCapabilities = academyDiscoveryFilters;

export function useAcademyDiscoveryStore(selector = (state) => state) {
  const [state, setLocalState] = useState(() => selector(academyDiscoveryStore.getState()));

  useEffect(() => {
    const unsubscribe = academyDiscoveryStore.subscribe((nextState) => {
      setLocalState(selector(nextState));
    });
    return unsubscribe;
  }, [selector]);

  return state;
}

export function useAcademyDiscoveryActions() {
  return useMemo(
    () => ({
      hydrateSavedFilters: academyDiscoveryStore.hydrateSavedFilters,
      setQuery: academyDiscoveryStore.setQuery,
      setFilters: academyDiscoveryStore.setFilters,
      setSort: academyDiscoveryStore.setSort,
      clearFilters: academyDiscoveryStore.clearFilters,
      setViewMode: academyDiscoveryStore.setViewMode,
      setSelectedAcademy: academyDiscoveryStore.setSelectedAcademy,
      requestLocation: academyDiscoveryStore.requestLocation,
      fetchAcademies: academyDiscoveryStore.fetchAcademies,
      fetchMapAcademies: academyDiscoveryStore.fetchMapAcademies,
      refresh: academyDiscoveryStore.refresh,
      fetchMore: academyDiscoveryStore.fetchMore,
      fetchDetails: academyDiscoveryStore.fetchDetails,
    }),
    []
  );
}

