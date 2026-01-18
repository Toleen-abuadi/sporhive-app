import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlaygroundsContext, usePlaygroundsStore } from './playgrounds.store';

const initialState = { data: null, loading: false, error: null };

const useAsyncResource = (loader, deps = null) => {
  const [state, setState] = useState(initialState);

  const load = useCallback(async (...args) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const res = await loader(...args);
    if (!res?.success) {
      setState({ data: null, loading: false, error: res?.error || new Error('Request failed') });
      return res;
    }
    setState({ data: res.data, loading: false, error: null });
    return res;
  }, [loader]);

  useEffect(() => {
    if (deps === null) {
      load();
      return;
    }
    load(...deps);
  }, deps === null ? [load] : deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, load };
};

export const useSlider = () => {
  const store = usePlaygroundsStore();
  const loadSlider = useCallback((params) => store.fetchSlider(params), [store]);
  return useAsyncResource(loadSlider);
};

export const useSearch = () => {
  const context = usePlaygroundsContext();
  const store = usePlaygroundsStore();
  const [filters, setFilters] = useState(context?.filters || null);
  const loader = useCallback((nextFilters) => store.searchVenues(nextFilters), [store]);
  const state = useAsyncResource(loader);

  useEffect(() => {
    let mounted = true;
    store.refreshFilters().then((stored) => {
      if (mounted) setFilters(stored);
    });
    return () => {
      mounted = false;
    };
  }, [store]);

  const updateFilters = useCallback(async (next) => {
    const updated = await store.setFilters(next);
    setFilters(updated);
    return loader(updated);
  }, [loader, store]);

  return { ...state, filters, updateFilters };
};

export const useVenue = (venueId) => {
  const store = usePlaygroundsStore();
  const loader = useCallback(() => store.fetchVenueDetails(venueId), [store, venueId]);
  return useAsyncResource(loader, [venueId]);
};

export const useBookingStepper = () => {
  const [step, setStep] = useState(0);
  const [bookingDraft, setBookingDraft] = useState({});

  const updateDraft = useCallback((patch) => {
    setBookingDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setStep(0);
    setBookingDraft({});
  }, []);

  const submit = useCallback(async () => {
    return playgroundsStore.createBooking(bookingDraft);
  }, [bookingDraft]);

  return {
    step,
    setStep,
    bookingDraft,
    updateDraft,
    reset,
    submit,
  };
};

export const useMyBookings = () => {
  const store = usePlaygroundsStore();
  const loader = useCallback((params) => store.listBookings(params), [store]);
  return useAsyncResource(loader);
};

export const useBookingDetails = (bookingId) => {
  const [details, setDetails] = useState(null);
  const listHook = useMyBookings();

  useEffect(() => {
    if (!bookingId || !listHook.data) return;
    const item = listHook.data.find((booking) => String(booking.id) === String(bookingId));
    setDetails(item || null);
  }, [bookingId, listHook.data]);

  return useMemo(() => ({ ...listHook, data: details || listHook.data }), [listHook, details]);
};

export const useRating = () => {
  const [state, setState] = useState(initialState);

  const resolveToken = useCallback(async (payload) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const res = await playgroundsStore.resolveRatingToken(payload);
    if (!res?.success) {
      setState({ data: null, loading: false, error: res?.error || new Error('Rating token failed') });
      return res;
    }
    setState({ data: res.data, loading: false, error: null });
    return res;
  }, []);

  const canRate = useCallback((payload) => playgroundsStore.canRate(payload), []);
  const createRating = useCallback((payload) => playgroundsStore.createRating(payload), []);

  return { ...state, resolveToken, canRate, createRating };
};
