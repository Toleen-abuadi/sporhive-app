import { useEffect, useMemo, useState } from 'react';
import { academyDiscoveryApi, academyDiscoveryFilters, ACADEMY_DISCOVERY_PAGE_SIZE } from '../api/academyDiscovery.api';
import { getAcademyDiscoveryState, setAcademyDiscoveryState } from './storage';

const DEFAULT_FILTERS = {
  age: null,
  registrationEnabled: false,
  proOnly: false,
  sort: 'recommended',
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeFilters = (filters = {}) => ({
  age: toNumberOrNull(filters.age),
  registrationEnabled: !!filters.registrationEnabled,
  proOnly: !!filters.proOnly,
  sort: typeof filters.sort === 'string' && filters.sort ? filters.sort : DEFAULT_FILTERS.sort,
});

const normalizeAcademy = (item) => item?.academy || item || null;

const isInRange = (value, from, to) => {
  const min = Math.min(from, to);
  const max = Math.max(from, to);
  return value >= min && value <= max;
};

const matchesQuery = (item, normalizedQuery) => {
  if (!normalizedQuery) return true;
  const academy = normalizeAcademy(item);
  const names = [
    academy?.name_en,
    academy?.name_ar,
    academy?.name,
    item?.name_en,
    item?.name_ar,
    item?.name,
  ];
  return names.some((name) => normalizeText(name).includes(normalizedQuery));
};

const matchesAge = (item, selectedAge) => {
  if (selectedAge == null) return true;
  const academy = normalizeAcademy(item);

  const academyFrom = toNumberOrNull(academy?.ages_from);
  const academyTo = toNumberOrNull(academy?.ages_to);
  if (academyFrom != null && academyTo != null) {
    return isInRange(selectedAge, academyFrom, academyTo);
  }

  const courses = Array.isArray(item?.courses)
    ? item.courses
    : Array.isArray(academy?.courses)
      ? academy.courses
      : [];
  return courses.some((course) => {
    const courseFrom = toNumberOrNull(course?.age_from ?? course?.ages_from);
    const courseTo = toNumberOrNull(course?.age_to ?? course?.ages_to);
    if (courseFrom == null || courseTo == null) return false;
    return isInRange(selectedAge, courseFrom, courseTo);
  });
};

const applyClientFilters = (items, { query, filters } = {}) => {
  const normalizedQuery = normalizeText(query || '');
  const selectedAge = toNumberOrNull(filters?.age);
  return (Array.isArray(items) ? items : []).filter(
    (item) => matchesQuery(item, normalizedQuery) && matchesAge(item, selectedAge)
  );
};

const INITIAL_STATE = {
  filters: { ...DEFAULT_FILTERS },
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
      const filters = normalizeFilters(stored.filters || {});
      const query = stored.query || '';
      setState({
        filters,
        query,
        viewMode: stored.viewMode || 'list',
        academies: applyClientFilters(discoveryState.rawAcademies, { query, filters }),
        mapAcademies: applyClientFilters(discoveryState.rawMapAcademies, { query, filters }),
        filtersLoaded: true,
      });
      return;
    }
    setState({ filtersLoaded: true });
  },
  setQuery(query) {
    const nextQuery = query ?? '';
    setState({
      query: nextQuery,
      academies: applyClientFilters(discoveryState.rawAcademies, {
        query: nextQuery,
        filters: discoveryState.filters,
      }),
      mapAcademies: applyClientFilters(discoveryState.rawMapAcademies, {
        query: nextQuery,
        filters: discoveryState.filters,
      }),
    });
  },
  setFilters(partial) {
    const nextFilters = normalizeFilters({ ...discoveryState.filters, ...(partial || {}) });
    setState({
      filters: nextFilters,
      academies: applyClientFilters(discoveryState.rawAcademies, {
        query: discoveryState.query,
        filters: nextFilters,
      }),
      mapAcademies: applyClientFilters(discoveryState.rawMapAcademies, {
        query: discoveryState.query,
        filters: nextFilters,
      }),
    });
  },
  async clearFilters() {
    const filters = { ...DEFAULT_FILTERS };
    const query = '';
    setState({
      filters,
      query,
      academies: applyClientFilters(discoveryState.rawAcademies, { query, filters }),
      mapAcademies: applyClientFilters(discoveryState.rawMapAcademies, { query, filters }),
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
    const isFirst = page === 1 && !append;
    if (isFirst) {
      setState({ listLoading: true, listError: null, page: 1, hasMore: true });
    } else {
      setState({ loadingMore: true, listError: null });
    }

    try {
      const res = await academyDiscoveryApi.listAcademies({
        filters: discoveryState.filters,
        query: effectiveQuery,
        page,
        pageSize: ACADEMY_DISCOVERY_PAGE_SIZE,
        coords: discoveryState.coords,
      });
      const items = Array.isArray(res?.items) ? res.items : [];
      const rawAcademies = append ? [...discoveryState.rawAcademies, ...items] : items;
      const filteredAcademies = applyClientFilters(rawAcademies, {
        query: effectiveQuery,
        filters: discoveryState.filters,
      });
      const hasMore = items.length >= ACADEMY_DISCOVERY_PAGE_SIZE;
      setState({
        rawAcademies,
        academies: filteredAcademies,
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
    const effectiveQuery = query ?? discoveryState.query;
    setState({ mapLoading: true, mapError: null });
    try {
      const res = await academyDiscoveryApi.listMapAcademies({
        filters: discoveryState.filters,
        query: effectiveQuery,
        coords: discoveryState.coords,
      });
      const items = Array.isArray(res?.items) ? res.items : [];
      const filteredMapAcademies = applyClientFilters(items, {
        query: effectiveQuery,
        filters: discoveryState.filters,
      });
      setState({
        rawMapAcademies: items,
        mapAcademies: filteredMapAcademies,
        mapLoading: false,
        mapError: null,
      });
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
