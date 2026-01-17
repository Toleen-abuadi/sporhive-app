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
import { publicUsersApi } from './publicUsers.api';
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

const PLAYGROUNDS_PUBLIC_USER_KEY = 'sporhive_public_user';
const PLAYGROUNDS_PUBLIC_CLIENT_KEY = 'sporhive_public_user_client';

let cachedPublicUserId = null;
let cachedPublicUser = null;
let cachedPublicClient = null;

let cachedFilters = { ...DEFAULT_FILTERS };
let isHydrated = false;

const listeners = new Set();

const emit = () => {
  const snapshot = {
    publicUserId: cachedPublicUserId,
    publicUser: cachedPublicUser,
    publicClient: cachedPublicClient,
    filters: cachedFilters,
    isInitialized: isHydrated,
  };
  listeners.forEach((listener) => listener(snapshot));
};

const hydrate = async () => {
  if (isHydrated) {
    return {
      publicUserId: cachedPublicUserId,
      publicUser: cachedPublicUser,
      publicClient: cachedPublicClient,
      filters: cachedFilters,
    };
  }

  const storedId = await storage.getPlaygroundsPublicUserId?.();
  cachedPublicUserId = storedId || null;

  cachedPublicUser = (await storage.getItem?.(PLAYGROUNDS_PUBLIC_USER_KEY)) || null;
  cachedPublicClient = (await storage.getItem?.(PLAYGROUNDS_PUBLIC_CLIENT_KEY)) || null;

  // ✅ FIX: correct constant name (was PLAYGROGUNDS_KEYS)
  const storedFilters = await storage.getItem?.(PLAYGROUNDS_KEYS.LAST_FILTERS);
  cachedFilters =
    storedFilters && typeof storedFilters === 'object'
      ? { ...DEFAULT_FILTERS, ...storedFilters }
      : { ...DEFAULT_FILTERS };

  isHydrated = true;
  emit();

  return {
    publicUserId: cachedPublicUserId,
    publicUser: cachedPublicUser,
    publicClient: cachedPublicClient,
    filters: cachedFilters,
  };
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

  // ----- filters -----
  getFilters: async () => {
    if (!isHydrated) await hydrate();
    return cachedFilters;
  },
  setFilters: async (filters) => {
    const next = { ...DEFAULT_FILTERS, ...(filters || {}) };
    cachedFilters = next;
    await storage.setItem?.(PLAYGROUNDS_KEYS.LAST_FILTERS, next);
    emit();
    return next;
  },

  // ----- public user -----
  getPublicUserId: async () => {
    if (!isHydrated) await hydrate();
    return cachedPublicUserId;
  },
  setPublicUserId: async (publicUserId) => {
    cachedPublicUserId = publicUserId || null;
    await storage.setPlaygroundsPublicUserId?.(publicUserId || null);
    emit();
    return cachedPublicUserId;
  },
  setPublicUser: async (user) => {
    cachedPublicUser = user || null;
    await storage.setItem?.(PLAYGROUNDS_PUBLIC_USER_KEY, cachedPublicUser);
    emit();
    return cachedPublicUser;
  },
  setPublicClient: async (client) => {
    cachedPublicClient = client || null;
    await storage.setItem?.(PLAYGROUNDS_PUBLIC_CLIENT_KEY, cachedPublicClient);
    emit();
    return cachedPublicClient;
  },
  logoutPublicUser: async () => {
    cachedPublicUserId = null;
    cachedPublicUser = null;
    cachedPublicClient = null;

    await storage.setPlaygroundsPublicUserId?.(null);
    await storage.setItem?.(PLAYGROUNDS_PUBLIC_USER_KEY, null);
    await storage.setItem?.(PLAYGROUNDS_PUBLIC_CLIENT_KEY, null);

    emit();
    return true;
  },

  // ----- auth (public-users) -----
  async loginPublicUser(payload = {}) {
    const res = await publicUsersApi.login(payload);
    if (!res?.success) return res;

    const data = res.data || {};
    const publicUser = data.user || data;
    const playgroundClient =
      data.playgrounds_client || data.playground_client || data.client || null;

    const publicUserId =
      publicUser?.id ||
      data.user_id ||
      data.userId ||
      data.public_user_id ||
      data.publicUserId ||
      null;

    if (publicUserId) await playgroundsStore.setPublicUserId(publicUserId);
    await playgroundsStore.setPublicUser(publicUser);
    if (playgroundClient) await playgroundsStore.setPublicClient(playgroundClient);

    return { success: true, data: { publicUser, playgroundClient, publicUserId } };
  },

  async registerPublicUser(payload = {}) {
    const res = await publicUsersApi.register(payload);
    if (!res?.success) return res;

    const data = res.data || {};
    const publicUser = data.user || data;
    const playgroundClient =
      data.playgrounds_client || data.playground_client || data.client || null;

    const publicUserId =
      publicUser?.id ||
      data.user_id ||
      data.userId ||
      data.public_user_id ||
      data.publicUserId ||
      null;

    if (publicUserId) await playgroundsStore.setPublicUserId(publicUserId);
    await playgroundsStore.setPublicUser(publicUser);
    if (playgroundClient) await playgroundsStore.setPublicClient(playgroundClient);

    return { success: true, data: { publicUser, playgroundClient, publicUserId } };
  },

  resetPasswordRequest(payload = {}) {
    return publicUsersApi.resetRequest(payload);
  },

  resetPasswordConfirm(payload = {}) {
    return publicUsersApi.resetConfirm(payload);
  },

  // ----- playgrounds -----
  async fetchSlider(params = {}) {
    const res = await playgroundsApi.fetchSlider(params);
    if (!res?.success) return res;
    return { success: true, data: normalizeSliderItems(res.data) };
  },

  async searchVenues(filters = {}) {
    const nextFilters = await playgroundsStore.setFilters(filters);
    const res = await playgroundsApi.searchVenues(nextFilters);
    if (!res?.success) return res;
    return { success: true, data: normalizeVenueList(res.data) };
  },

  async fetchVenueDetails(venueId) {
    const res = await playgroundsApi.fetchVenueDetails(venueId);
    if (!res?.success) return res;
    return { success: true, data: normalizeVenueDetails(res.data) };
  },

  async fetchSlots(venueId, params = {}) {
    const res = await playgroundsApi.fetchSlots(venueId, params);
    if (!res?.success) return res;
    return { success: true, data: normalizeSlots(res.data) };
  },

  async createBooking(payload = {}) {
    const body = await withPublicUser(payload);
    const res = await playgroundsApi.createBooking(body);
    if (!res?.success) return res;
    return { success: true, data: normalizeBookingDetails(res.data) };
  },

  async listBookings(params = {}) {
    const enriched = await withPublicUser(params);
    const res = await playgroundsApi.listBookings(enriched);
    if (!res?.success) return res;
    return { success: true, data: normalizeBookings(res.data) };
  },

  async cancelBooking(bookingIdOrPayload) {
    // ensure user_id is attached if caller passes only bookingId
    const enriched = await withPublicUser(
      typeof bookingIdOrPayload === 'object' ? bookingIdOrPayload : {}
    );

    const res =
      typeof bookingIdOrPayload === 'object'
        ? await playgroundsApi.cancelBooking({ ...bookingIdOrPayload, ...enriched })
        : await playgroundsApi.cancelBooking(bookingIdOrPayload);

    if (!res?.success) return res;
    return { success: true, data: normalizeBookingDetails(res.data) };
  },

  async updateBooking(bookingId, payload = {}) {
    const body = await withPublicUser(payload);
    const res = await playgroundsApi.updateBooking(bookingId, body);
    if (!res?.success) return res;
    return { success: true, data: normalizeBookingDetails(res.data) };
  },

  // ----- ratings -----
  async resolveRatingToken(payload = {}) {
    const res = await playgroundsApi.resolveRatingToken(payload);
    if (!res?.success) return res;
    return { success: true, data: normalizeRating(res.data) };
  },

  async identifyPublicUser(payload = {}) {
    const res = await playgroundsApi.identifyPublicUser(payload);
    if (!res?.success) return res;

    const data = res.data || {};
    const publicUserId =
      data.user_id ||
      data.userId ||
      data.public_user_id ||
      data.publicUserId ||
      data.id ||
      null;

    if (publicUserId) await playgroundsStore.setPublicUserId(publicUserId);

    return { success: true, data: { ...data, publicUserId } };
  },

  async canRate(payload = {}) {
    return playgroundsApi.canRate(payload);
  },

  async createRating(payload = {}) {
    const body = await withPublicUser(payload);
    const res = await playgroundsApi.createRating(body);
    if (!res?.success) return res;
    return { success: true, data: normalizeRating(res.data) };
  },
};

// ---------------- Context / Provider ----------------

const PlaygroundsContext = createContext(null);

export const usePlaygroundsContext = () => useContext(PlaygroundsContext);

/**
 * ✅ Important:
 * - If Provider is missing, context is null, which caused your crash.
 * - This hook now returns a safe object that points to playgroundsStore functions,
 *   so the app won't hard-crash and you can still see requests happening.
 */
export const usePlaygroundsStore = () => {
  const ctx = usePlaygroundsContext();
  if (ctx) return ctx;

  // fallback (Provider not mounted)
  return {
    publicUserId: cachedPublicUserId,
    publicUser: cachedPublicUser,
    publicClient: cachedPublicClient,
    filters: cachedFilters,
    isInitialized: isHydrated,

    setFilters: playgroundsStore.setFilters,
    refreshFilters: playgroundsStore.getFilters,
    setPublicUserId: playgroundsStore.setPublicUserId,

    identifyPublicUser: playgroundsStore.identifyPublicUser,
    loginPublicUser: playgroundsStore.loginPublicUser,
    registerPublicUser: playgroundsStore.registerPublicUser,
    resetPasswordRequest: playgroundsStore.resetPasswordRequest,
    resetPasswordConfirm: playgroundsStore.resetPasswordConfirm,
    logoutPublicUser: playgroundsStore.logoutPublicUser,
  };
};

export const usePlaygroundsAuth = () => {
  const context = usePlaygroundsContext();
  const publicUserId = context?.publicUserId ?? cachedPublicUserId;
  const isInitialized = context?.isInitialized ?? isHydrated;

  return {
    publicUserId,
    publicUser: context?.publicUser ?? cachedPublicUser,
    publicClient: context?.publicClient ?? cachedPublicClient,
    isAuthenticated: Boolean(publicUserId),
    isInitialized,
  };
};

export function PlaygroundsProvider({ children }) {
  const [state, setState] = useState({
    publicUserId: cachedPublicUserId,
    publicUser: cachedPublicUser,
    publicClient: cachedPublicClient,
    filters: cachedFilters,
    isInitialized: isHydrated,
  });

  useEffect(() => {
    let mounted = true;

    hydrate().then(() => {
      if (!mounted) return;
      setState({
        publicUserId: cachedPublicUserId,
        publicUser: cachedPublicUser,
        publicClient: cachedPublicClient,
        filters: cachedFilters,
        isInitialized: true,
      });
    });

    const unsubscribe = playgroundsStore.subscribe((next) => {
      if (!mounted) return;
      setState({
        publicUserId: next.publicUserId,
        publicUser: next.publicUser,
        publicClient: next.publicClient,
        filters: next.filters,
        isInitialized: next.isInitialized,
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const identifyPublicUser = useCallback(async (payload) => playgroundsStore.identifyPublicUser(payload), []);
  const loginPublicUser = useCallback(async (payload) => playgroundsStore.loginPublicUser(payload), []);
  const registerPublicUser = useCallback(async (payload) => playgroundsStore.registerPublicUser(payload), []);
  const resetPasswordRequest = useCallback(async (payload) => playgroundsStore.resetPasswordRequest(payload), []);
  const resetPasswordConfirm = useCallback(async (payload) => playgroundsStore.resetPasswordConfirm(payload), []);
  const logoutPublicUser = useCallback(async () => playgroundsStore.logoutPublicUser(), []);

  const value = useMemo(() => ({
    ...state,
    setFilters: playgroundsStore.setFilters,
    refreshFilters: playgroundsStore.getFilters,
    setPublicUserId: playgroundsStore.setPublicUserId,

    identifyPublicUser,
    loginPublicUser,
    registerPublicUser,
    resetPasswordRequest,
    resetPasswordConfirm,
    logoutPublicUser,
  }), [
    state,
    identifyPublicUser,
    loginPublicUser,
    registerPublicUser,
    resetPasswordRequest,
    resetPasswordConfirm,
    logoutPublicUser,
  ]);

  return (
    <PlaygroundsContext.Provider value={value}>
      {children}
    </PlaygroundsContext.Provider>
  );
}
