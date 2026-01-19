import { useEffect, useMemo, useState } from 'react';
import { playgroundsApi } from './playgrounds.api';

const CACHE_TTL_MS = 5 * 60 * 1000;

const INITIAL_STATE = {
  venues: [],
  venuesLoading: false,
  venuesError: null,
  venuesByKey: {},
  venueDetails: {},
  activities: [],
  activitiesLoading: false,
  activitiesError: null,
  slotsByKey: {},
  bookings: [],
  bookingsLoading: false,
  bookingsError: null,
};

let playgroundsState = { ...INITIAL_STATE };
const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener(playgroundsState));
};

const setState = (patch) => {
  playgroundsState = { ...playgroundsState, ...patch };
  emit();
};

const setVenueDetails = (venueId, venue) => {
  playgroundsState = {
    ...playgroundsState,
    venueDetails: {
      ...playgroundsState.venueDetails,
      [venueId]: venue,
    },
  };
  emit();
};

const setSlots = (key, slots) => {
  playgroundsState = {
    ...playgroundsState,
    slotsByKey: {
      ...playgroundsState.slotsByKey,
      [key]: { slots, cachedAt: Date.now() },
    },
  };
  emit();
};

const isFresh = (entry) => entry && Date.now() - entry.cachedAt < CACHE_TTL_MS;

const makeCacheKey = (parts) => JSON.stringify(parts || {});

export const playgroundsStore = {
  getState: () => playgroundsState,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  clear: () => {
    playgroundsState = { ...INITIAL_STATE };
    emit();
  },
  async listVenues(params = {}) {
    const key = makeCacheKey({ list: params });
    const cached = playgroundsState.venuesByKey[key];
    if (isFresh(cached)) {
      setState({ venues: cached.data, venuesError: null, venuesLoading: false });
      return { success: true, data: cached.data, cached: true };
    }

    setState({ venuesLoading: true, venuesError: null });
    try {
      const res = await playgroundsApi.listVenues(params);
      const data = res.venues || [];
      playgroundsState = {
        ...playgroundsState,
        venues: data,
        venuesLoading: false,
        venuesError: null,
        venuesByKey: {
          ...playgroundsState.venuesByKey,
          [key]: { data, cachedAt: Date.now() },
        },
      };
      emit();
      return { success: true, data };
    } catch (error) {
      setState({ venuesLoading: false, venuesError: error?.message || 'Unable to load venues.' });
      return { success: false, error };
    }
  },
  async getVenueDetails(venueId, params = {}) {
    if (!venueId) return { success: false, error: new Error('Missing venue id') };
    const cached = playgroundsState.venueDetails[venueId];
    if (cached) {
      return { success: true, data: cached, cached: true };
    }
    try {
      const res = await playgroundsApi.getVenueDetails(venueId, params);
      if (res.venue) {
        setVenueDetails(venueId, res.venue);
        return { success: true, data: res.venue };
      }
      return { success: false, error: new Error('Venue not found') };
    } catch (error) {
      return { success: false, error };
    }
  },
  async listActivities(params = {}) {
    setState({ activitiesLoading: true, activitiesError: null });
    try {
      const res = await playgroundsApi.listActivities(params);
      setState({ activities: res.activities || [], activitiesLoading: false, activitiesError: null });
      return { success: true, data: res.activities || [] };
    } catch (error) {
      setState({ activitiesLoading: false, activitiesError: error?.message || 'Unable to load activities.' });
      return { success: false, error };
    }
  },
  async getVenueDurations(venueId) {
    try {
      const res = await playgroundsApi.getVenueDurations(venueId);
      return { success: true, data: res };
    } catch (error) {
      return { success: false, error };
    }
  },
  async listAvailableSlots({ venueId, date, durationId, ...rest } = {}) {
    const key = makeCacheKey({ venueId, date, durationId, ...rest });
    const cached = playgroundsState.slotsByKey[key];
    if (isFresh(cached)) {
      return { success: true, data: cached.slots, cached: true };
    }
    try {
      const res = await playgroundsApi.listAvailableSlots({ venueId, date, durationId, ...rest });
      const slots = res?.slots || res?.data?.slots || res?.data || [];
      setSlots(key, slots);
      return { success: true, data: slots };
    } catch (error) {
      return { success: false, error };
    }
  },
  async listBookings(payload = {}) {
    setState({ bookingsLoading: true, bookingsError: null });
    try {
      const res = await playgroundsApi.listBookings(payload);
      setState({ bookings: res.bookings || [], bookingsLoading: false, bookingsError: null });
      return { success: true, data: res.bookings || [] };
    } catch (error) {
      setState({ bookingsLoading: false, bookingsError: error?.message || 'Unable to load bookings.' });
      return { success: false, error };
    }
  },
  async createBooking(payload) {
    try {
      const res = await playgroundsApi.createBooking(payload);
      return { success: true, data: res };
    } catch (error) {
      return { success: false, error };
    }
  },
  async rateBooking(payload) {
    try {
      const res = await playgroundsApi.rateBooking(payload);
      return { success: true, data: res };
    } catch (error) {
      return { success: false, error };
    }
  },
};

export function usePlaygroundsStore(selector = (state) => state) {
  const [state, setLocalState] = useState(() => selector(playgroundsStore.getState()));

  useEffect(() => {
    const unsubscribe = playgroundsStore.subscribe((nextState) => {
      setLocalState(selector(nextState));
    });
    return unsubscribe;
  }, [selector]);

  return state;
}

export function usePlaygroundsActions() {
  return useMemo(
    () => ({
      listVenues: playgroundsStore.listVenues,
      getVenueDetails: playgroundsStore.getVenueDetails,
      listActivities: playgroundsStore.listActivities,
      getVenueDurations: playgroundsStore.getVenueDurations,
      listAvailableSlots: playgroundsStore.listAvailableSlots,
      listBookings: playgroundsStore.listBookings,
      createBooking: playgroundsStore.createBooking,
      rateBooking: playgroundsStore.rateBooking,
    }),
    []
  );
}
