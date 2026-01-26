import { useEffect, useMemo, useState } from 'react';
import { playgroundsApi } from './playgrounds.api';
import { normalizeApiError } from '../api/normalizeApiError';
import { getBookingDraft, getPlaygroundsFilters, setBookingDraft, setPlaygroundsFilters } from './storage';

const CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_FILTERS = {
  activityId: '',
  date: '',
  players: 2,
  baseLocation: '',
  hasSpecialOffer: false,
  sortBy: 'rating_desc',
  academyProfileId: '',
};

const INITIAL_STATE = {
  filters: { ...DEFAULT_FILTERS },
  appliedFilters: { ...DEFAULT_FILTERS },
  filtersLoaded: false,
  venues: [],
  venuesLoading: false,
  venuesError: null,
  venuesByKey: {},
  venueDetails: {},
  selectedVenueId: null,
  activities: [],
  activitiesLoading: false,
  activitiesError: null,
  durationsByVenue: {},
  durationsLoading: false,
  durationsError: null,
  slotsByKey: {},
  slotsLoadingByKey: {},
  slotsErrorByKey: {},
  bookings: [],
  bookingsLoading: false,
  bookingsError: null,
  bookingDraft: null,
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

const buildFiltersPayload = (filters) => {
  const payload = {
    activity_id: filters.activityId || undefined,
    date: filters.date || undefined,
    number_of_players: filters.players || undefined,
    base_location: filters.baseLocation || undefined,
    academy_profile_id: filters.academyProfileId || undefined,
    has_special_offer: filters.hasSpecialOffer || undefined,
    order_by: filters.sortBy || undefined,
  };
  return payload;
};

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
  async hydrate() {
    const [storedFilters, draft] = await Promise.all([getPlaygroundsFilters(), getBookingDraft()]);
    if (storedFilters) {
      const nextFilters = { ...DEFAULT_FILTERS, ...storedFilters };
      setState({ filters: nextFilters, appliedFilters: nextFilters, filtersLoaded: true });
    } else {
      setState({ filtersLoaded: true });
    }
    if (draft) {
      setState({ bookingDraft: draft });
    }
  },
  setFilters(partial) {
    setState({ filters: { ...playgroundsState.filters, ...(partial || {}) } });
  },
  async applyFilters() {
    const nextFilters = { ...playgroundsState.filters };
    setState({ appliedFilters: nextFilters });
    await setPlaygroundsFilters(nextFilters);
    return nextFilters;
  },
  async resetFilters() {
    setState({ filters: { ...DEFAULT_FILTERS }, appliedFilters: { ...DEFAULT_FILTERS } });
    await setPlaygroundsFilters(DEFAULT_FILTERS);
  },
  async listVenues(params = {}) {
    const payload = { ...buildFiltersPayload(playgroundsState.appliedFilters), ...(params || {}) };
    const key = makeCacheKey({ list: payload });
    const cached = playgroundsState.venuesByKey[key];
    if (isFresh(cached)) {
      setState({ venues: cached.data, venuesError: null, venuesLoading: false });
      return { success: true, data: cached.data, cached: true };
    }

    setState({ venuesLoading: true, venuesError: null });
    try {
      const res = await playgroundsApi.listVenues(payload);
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
      const normalized = normalizeApiError(error);
      setState({ venuesLoading: false, venuesError: normalized });
      return { success: false, error };
    }
  },
  setSelectedVenue(venueId) {
    setState({ selectedVenueId: venueId });
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
      const normalized = normalizeApiError(error);
      setState({ activitiesLoading: false, activitiesError: normalized });
      return { success: false, error };
    }
  },
  async getVenueDurations(venueId, params = {}) {
    if (!venueId) return { success: false, error: new Error('Missing venue id') };
    setState({ durationsLoading: true, durationsError: null });
    try {
      const res = await playgroundsApi.getDurations({
        venueId,
        activityId: params.activityId,
        academyProfileId: params.academyProfileId,
      });
      const durations = Array.isArray(res?.durations) ? res.durations : res?.data?.durations || res?.data || res;
      setState({
        durationsByVenue: { ...playgroundsState.durationsByVenue, [venueId]: durations || [] },
        durationsLoading: false,
        durationsError: null,
      });
      return { success: true, data: durations || [] };
    } catch (error) {
      const normalized = normalizeApiError(error);
      setState({ durationsLoading: false, durationsError: normalized });
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
      setState({
        slotsLoadingByKey: { ...playgroundsState.slotsLoadingByKey, [key]: true },
        slotsErrorByKey: { ...playgroundsState.slotsErrorByKey, [key]: null },
      });
      const res = await playgroundsApi.listAvailableSlots({ venueId, date, durationId, ...rest });
      const slots = res?.slots || res?.data?.slots || res?.data || [];
      setSlots(key, slots);
      setState({
        slotsLoadingByKey: { ...playgroundsState.slotsLoadingByKey, [key]: false },
      });
      return { success: true, data: slots };
    } catch (error) {
      const normalized = normalizeApiError(error);
      setState({
        slotsLoadingByKey: { ...playgroundsState.slotsLoadingByKey, [key]: false },
        slotsErrorByKey: { ...playgroundsState.slotsErrorByKey, [key]: normalized },
      });
      return { success: false, error };
    }
  },
  async verifySlotAvailability({ venueId, date, durationId, startTime, ...rest } = {}) {
    try {
      const res = await playgroundsApi.verifySlotAvailability({
        venueId,
        date,
        durationId,
        startTime,
        ...rest,
      });
      return { success: true, data: res };
    } catch (error) {
      const normalized = normalizeApiError(error);
      return { success: false, error: normalized };
    }
  },
  async listBookings(payload = {}, options = {}) {
    setState({ bookingsLoading: true, bookingsError: null, bookingsErrorStatus: null });
    try {
      const res = await playgroundsApi.listBookings(payload, options);
      setState({
        bookings: res.bookings || [],
        bookingsLoading: false,
        bookingsError: null,
        bookingsErrorStatus: null,
      });
      return { success: true, data: res.bookings || [] };
    } catch (error) {
      const normalized = normalizeApiError(error);
      setState({
        bookingsLoading: false,
        bookingsError: normalized,
        bookingsErrorStatus: normalized.status,
      });
      return { success: false, error };
    }
  },
  async createBooking(payload, config = {}) {
    try {
      const res = await playgroundsApi.createBooking(payload, config);
      return { success: true, data: res };
    } catch (error) {
      return { success: false, error };
    }
  },
  async setBookingDraft(draft) {
    await setBookingDraft(draft);
    setState({ bookingDraft: draft });
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
      hydrate: playgroundsStore.hydrate,
      setFilters: playgroundsStore.setFilters,
      applyFilters: playgroundsStore.applyFilters,
      resetFilters: playgroundsStore.resetFilters,
      listVenues: playgroundsStore.listVenues,
      setSelectedVenue: playgroundsStore.setSelectedVenue,
      getVenueDetails: playgroundsStore.getVenueDetails,
      listActivities: playgroundsStore.listActivities,
      getVenueDurations: playgroundsStore.getVenueDurations,
      listAvailableSlots: playgroundsStore.listAvailableSlots,
      verifySlotAvailability: playgroundsStore.verifySlotAvailability,
      listBookings: playgroundsStore.listBookings,
      createBooking: playgroundsStore.createBooking,
      setBookingDraft: playgroundsStore.setBookingDraft,
      rateBooking: playgroundsStore.rateBooking,
    }),
    []
  );
}
