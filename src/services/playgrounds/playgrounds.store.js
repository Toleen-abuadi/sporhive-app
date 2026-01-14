import { useEffect, useState } from 'react';
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
let cachedFilters = null;
const authListeners = new Set();

const readFilters = async () => {
  if (cachedFilters) return cachedFilters;
  const stored = await storage.getItem(PLAYGROUNDS_KEYS.LAST_FILTERS);
  if (stored && typeof stored === 'object') {
    cachedFilters = { ...DEFAULT_FILTERS, ...stored };
    return cachedFilters;
  }
  cachedFilters = { ...DEFAULT_FILTERS };
  return cachedFilters;
};

const persistFilters = async (filters) => {
  const next = { ...DEFAULT_FILTERS, ...(filters || {}) };
  cachedFilters = next;
  await storage.setItem(PLAYGROUNDS_KEYS.LAST_FILTERS, next);
  return next;
};

const resolvePublicUserId = async () => {
  if (cachedPublicUserId) return cachedPublicUserId;
  const stored = await storage.getItem(PLAYGROUNDS_KEYS.PUBLIC_USER_ID);
  if (stored) {
    cachedPublicUserId = stored;
    return stored;
  }
  return null;
};

const setPublicUserId = async (publicUserId) => {
  if (!publicUserId) return null;
  cachedPublicUserId = publicUserId;
  await storage.setItem(PLAYGROUNDS_KEYS.PUBLIC_USER_ID, publicUserId);
  authListeners.forEach((listener) => listener(publicUserId));
  return publicUserId;
};

const withPublicUser = async (payload = {}) => {
  const publicUserId = await resolvePublicUserId();
  if (!publicUserId) return { ...payload };
  return { ...payload, public_user_id: publicUserId, user_id: publicUserId };
};

export const usePlaygroundsAuth = () => {
  const [publicUserId, setPublicUserIdState] = useState(cachedPublicUserId);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    resolvePublicUserId().then((id) => {
      if (!mounted) return;
      setPublicUserIdState(id);
      setIsInitialized(true);
    });

    const listener = (id) => {
      setPublicUserIdState(id);
      setIsInitialized(true);
    };
    authListeners.add(listener);

    return () => {
      mounted = false;
      authListeners.delete(listener);
    };
  }, []);

  return {
    publicUserId,
    isAuthenticated: Boolean(publicUserId),
    isInitialized,
  };
};

export const playgroundsStore = {
  getFilters: readFilters,
  setFilters: persistFilters,
  getPublicUserId: resolvePublicUserId,
  setPublicUserId,

  async fetchSlider(params = {}) {
    const res = await playgroundsApi.fetchSlider(params);
    if (!res.success) return res;
    return { success: true, data: normalizeSliderItems(res.data) };
  },

  async searchVenues(filters = {}) {
    const nextFilters = await persistFilters(filters);
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
      await setPublicUserId(publicUserId);
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
