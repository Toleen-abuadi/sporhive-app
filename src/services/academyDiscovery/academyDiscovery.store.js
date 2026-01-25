import { useEffect, useMemo, useState } from 'react';
import { academyDiscoveryApi, academyDiscoveryFilters, ACADEMY_DISCOVERY_PAGE_SIZE } from '../api/academyDiscovery.api';
import { getAcademyDiscoveryState, setAcademyDiscoveryState } from './storage';

const DEFAULT_FILTERS = {
  sport: '',
  city: '',
  ageFrom: '',
  ageTo: '',
  registrationEnabled: false,
  proOnly: false,
  sort: 'recommended',
};

const INITIAL_STATE = {
  filters: { ...DEFAULT_FILTERS },
  filtersLoaded: false,
  query: '',
  viewMode: 'list',
  academies: [],
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

const persistState = async () => {
  const payload = {
    filters: discoveryState.filters,
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
    if (stored) {
      setState({
        filters: { ...DEFAULT_FILTERS, ...(stored.filters || {}) },
        query: stored.query || '',
        viewMode: stored.viewMode || 'list',
        filtersLoaded: true,
      });
      return;
    }
    setState({ filtersLoaded: true });
  },
  setQuery(query) {
    setState({ query: query ?? '' });
  },
  setFilters(partial) {
    setState({ filters: { ...discoveryState.filters, ...(partial || {}) } });
  },
  async clearFilters() {
    setState({ filters: { ...DEFAULT_FILTERS }, query: '' });
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
    const isFirst = page === 1 && !append;
    if (isFirst) {
      setState({ listLoading: true, listError: null, page: 1, hasMore: true });
    } else {
      setState({ loadingMore: true, listError: null });
    }

    try {
      const res = await academyDiscoveryApi.listAcademies({
        filters: discoveryState.filters,
        query: query ?? discoveryState.query,
        page,
        pageSize: ACADEMY_DISCOVERY_PAGE_SIZE,
        coords: discoveryState.coords,
      });
      const items = Array.isArray(res?.items) ? res.items : [];
      const hasMore = items.length >= ACADEMY_DISCOVERY_PAGE_SIZE;
      setState({
        academies: append ? [...discoveryState.academies, ...items] : items,
        listLoading: false,
        loadingMore: false,
        listError: null,
        hasMore,
        page,
      });
      await persistState();
      return { success: true, data: items };
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
    setState({ mapLoading: true, mapError: null });
    try {
      const res = await academyDiscoveryApi.listMapAcademies({
        filters: discoveryState.filters,
        query: query ?? discoveryState.query,
        coords: discoveryState.coords,
      });
      const items = Array.isArray(res?.items) ? res.items : [];
      setState({ mapAcademies: items, mapLoading: false, mapError: null });
      await persistState();
      return { success: true, data: items };
    } catch (error) {
      setState({ mapLoading: false, mapError: error?.message || 'Unable to load map.' });
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
