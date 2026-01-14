import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { storage, PLAYGROUNDS_KEYS } from '../storage/storage';
import { playgroundsApi } from './playgrounds.api';
import {
  normalizeBookings,
  normalizeBookingDetails,
  normalizeRating,
  normalizeSliderItems,
  normalizeSlots,
  normalizeVenueDetails,
  normalizeVenueList,
} from './playgrounds.normalize';

const DEFAULT_FILTERS = {
  query: '',
  city: null,
  sport: null,
  date: null,
  priceRange: null,
  amenities: [],
  sort: 'recommended',
};

let cachedPublicUserId = null;
let cachedFilters = { ...DEFAULT_FILTERS };
let isHydrated = false;
const listeners = new Set();

const emit = () => {
  const snapshot = {
    publicUserId: cachedPublicUserId,
    filters: cachedFilters,
    isInitialized: isHydrated,
  };
  listeners.forEach((listener) => listener(snapshot));
};

const hydrate = async () => {
  if (isHydrated) return { publicUserId: cachedPublicUserId, filters: cachedFilters };
  const storedId = await storage.getPlaygroundsPublicUserId();
  cachedPublicUserId = storedId || null;

  const storedFilters = await storage.getItem(PLAYGROUNDS_KEYS.LAST_FILTERS);
  cachedFilters = storedFilters && typeof storedFilters === 'object'
    ? { ...DEFAULT_FILTERS, ...storedFilters }
    : { ...DEFAULT_FILTERS };

  isHydrated = true;
  emit();
  return { publicUserId: cachedPublicUserId, filters: cachedFilters };
};

const withPublicUser = async (payload = {}) => {
  const publicUserId = await playgroundsStore.getPublicUserId();
  if (!publicUserId) return { ...payload };
  return { ...payload, public_user_id: publicUserId, user_id: publicUserId };
};

export const playgroundsStore = {
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getFilters: async () => {
    if (!isHydrated) await hydrate();
    return cachedFilters;
  },
  setFilters: async (filters) => {
    const next = { ...DEFAULT_FILTERS, ...(filters || {}) };
    cachedFilters = next;
    await storage.setItem(PLAYGROUNDS_KEYS.LAST_FILTERS, next);
    emit();
    return next;
  },
  getPublicUserId: async () => {
    if (!isHydrated) await hydrate();
    return cachedPublicUserId;
  },
  setPublicUserId: async (publicUserId) => {
    cachedPublicUserId = publicUserId || null;
    await storage.setPlaygroundsPublicUserId(publicUserId);
    emit();
    return cachedPublicUserId;
  },

  async fetchSlider(params = {}) {
    const res = await playgroundsApi.fetchSlider(params);
    if (!res.success) return res;
    return { success: true, data: normalizeSliderItems(res.data) };
  },

  async searchVenues(filters = {}) {
    const nextFilters = await playgroundsStore.setFilters(filters);
    const res = await playgroundsApi.searchVenues(nextFilters);
    if (!res.success) return res;
    return { success: true, data: normalizeVenueList(res.data) };
  },

  async fetchVenueDetails(venueId) {
    const res = await playgroundsApi.fetchVenueDetails(venueId);
    if (!res.success) return res;
    return { success: true, data: normalizeVenueDetails(res.data) };
  },

  async fetchSlots(venueId, params = {}) {
    const res = await playgroundsApi.fetchSlots(venueId, params);
    if (!res.success) return res;
    return { success: true, data: normalizeSlots(res.data) };
  },

  async createBooking(payload = {}) {
    const body = await withPublicUser(payload);
    const res = await playgroundsApi.createBooking(body);
    if (!res.success) return res;
    return { success: true, data: normalizeBookingDetails(res.data) };
  },

  async listBookings(params = {}) {
    const enriched = await withPublicUser(params);
    const res = await playgroundsApi.listBookings(enriched);
    if (!res.success) return res;
    return { success: true, data: normalizeBookings(res.data) };
  },

  async cancelBooking(bookingId) {
    const res = await playgroundsApi.cancelBooking(bookingId);
    if (!res.success) return res;
    return { success: true, data: normalizeBookingDetails(res.data) };
  },

  async updateBooking(bookingId, payload = {}) {
    const body = await withPublicUser(payload);
    const res = await playgroundsApi.updateBooking(bookingId, body);
    if (!res.success) return res;
    return { success: true, data: normalizeBookingDetails(res.data) };
  },

  async resolveRatingToken(payload = {}) {
    const res = await playgroundsApi.resolveRatingToken(payload);
    if (!res.success) return res;
    return { success: true, data: normalizeRating(res.data) };
  },

  async identifyPublicUser(payload = {}) {
    const res = await playgroundsApi.identifyPublicUser(payload);
    if (!res.success) return res;
    const data = res.data || {};
    const publicUserId =
      data.user_id ||
      data.userId ||
      data.public_user_id ||
      data.publicUserId ||
      data.id ||
      null;
    if (publicUserId) {
      await playgroundsStore.setPublicUserId(publicUserId);
    }
    return { success: true, data: { ...data, publicUserId } };
  },

  async canRate(payload = {}) {
    const res = await playgroundsApi.canRate(payload);
    if (!res.success) return res;
    return res;
  },

  async createRating(payload = {}) {
    const body = await withPublicUser(payload);
    const res = await playgroundsApi.createRating(body);
    if (!res.success) return res;
    return { success: true, data: normalizeRating(res.data) };
  },
};

const PlaygroundsContext = createContext(null);

export const usePlaygroundsContext = () => useContext(PlaygroundsContext);
export const usePlaygroundsStore = () => usePlaygroundsContext();

export const usePlaygroundsAuth = () => {
  const context = usePlaygroundsContext();
  const publicUserId = context?.publicUserId ?? cachedPublicUserId;
  const isInitialized = context?.isInitialized ?? isHydrated;

  return {
    publicUserId,
    isAuthenticated: Boolean(publicUserId),
    isInitialized,
  };
};

export function PlaygroundsProvider({ children }) {
  const [state, setState] = useState({
    publicUserId: cachedPublicUserId,
    filters: cachedFilters,
    isInitialized: isHydrated,
  });

  useEffect(() => {
    let mounted = true;
    hydrate().then(() => {
      if (!mounted) return;
      setState({
        publicUserId: cachedPublicUserId,
        filters: cachedFilters,
        isInitialized: true,
      });
    });
    const unsubscribe = playgroundsStore.subscribe((next) => {
      if (!mounted) return;
      setState({
        publicUserId: next.publicUserId,
        filters: next.filters,
        isInitialized: next.isInitialized,
      });
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const identifyPublicUser = useCallback(async (payload) => {
    return playgroundsStore.identifyPublicUser(payload);
  }, []);

  const value = useMemo(() => ({
    ...state,
    setFilters: playgroundsStore.setFilters,
    identifyPublicUser,
    setPublicUserId: playgroundsStore.setPublicUserId,
    refreshFilters: playgroundsStore.getFilters,
  }), [state, identifyPublicUser]);

  return (
    <PlaygroundsContext.Provider value={value}>
      {children}
    </PlaygroundsContext.Provider>
  );
}
