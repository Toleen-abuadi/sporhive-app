import { useEffect, useMemo, useState } from 'react';
import { playerPortalApi } from '../services/api/playerPortalApi';
import { normalizeApiError } from '../services/api/normalizeApiError';
import { storage } from '../services/storage/storage';
import { STORAGE_KEYS } from '../services/storage/keys';
import { persistTryOutIdFromOverview } from '../services/portal/portal.tryout';

const DEFAULT_FILTERS = {
  payments: {
    status: 'all',
    from: '',
    to: '',
  },
  orders: {
    status: 'all',
  },
  renewals: {
    status: 'all',
  },
};

const INITIAL_STATE = {
  filters: { ...DEFAULT_FILTERS },
  filtersLoaded: false,

  overview: null,
  overviewLoading: false,
  overviewError: null,

  profile: null,
  profileLoading: false,
  profileError: null,

  payments: [],
  paymentsLoading: false,
  paymentsError: null,

  orders: [],
  ordersLoading: false,
  ordersError: null,

  renewals: [],
  renewalsLoading: false,
  renewalsError: null,
};

let portalState = { ...INITIAL_STATE };
const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener(portalState));
};

const setState = (patch) => {
  portalState = { ...portalState, ...patch };
  emit();
};

// --------------------
// SAFE STORAGE HELPERS (prevents SQLite native crash)
// --------------------
const getFiltersStorageKey = () => {
  const key = STORAGE_KEYS?.PLAYER_PORTAL_FILTERS;
  // If this is missing, it WILL crash SQLite. Make it safe.
  return typeof key === 'string' && key.trim() ? key : 'PLAYER_PORTAL_FILTERS';
};

const safeJsonParse = (value) => {
  if (value == null) return null;
  if (typeof value === 'object') return value; // already parsed
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const safeStringify = (value) => {
  if (value == null) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return 'null';
  }
};

const persistFilters = async () => {
  const key = getFiltersStorageKey();
  const value = safeStringify(portalState.filters);
  await storage.setItem(key, value);
};

// --------------------
// FILTER APPLY
// --------------------
const applyPaymentFilters = (payments, filters) => {
  const status = String(filters?.status || 'all').toLowerCase();
  const from = filters?.from ? new Date(filters.from) : null;
  const to = filters?.to ? new Date(filters.to) : null;

  return (payments || []).filter((payment) => {
    const paymentStatus = String(payment?.status || '').toLowerCase();
    const dateValue = payment?.paidOn || payment?.dueDate || '';
    const date = dateValue ? new Date(dateValue) : null;

    if (status === 'unpaid') {
      if (paymentStatus.includes('paid')) return false;
    } else if (status !== 'all' && paymentStatus && !paymentStatus.includes(status)) {
      return false;
    }
    if (from && date && date < from) return false;
    if (to && date && date > to) return false;
    return true;
  });
};

const applyOrderFilters = (orders, filters) => {
  const status = String(filters?.status || 'all').toLowerCase();
  return (orders || []).filter((order) => {
    const orderStatus = String(order?.status || order?.state || '').toLowerCase();
    if (status === 'all') return true;
    return orderStatus.includes(status);
  });
};

export const playerPortalStore = {
  getState: () => portalState,

  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // ---- Filters ----
  async hydrateFilters() {
    try {
      const key = getFiltersStorageKey();
      const storedRaw = await storage.getItem(key);
      const stored = safeJsonParse(storedRaw);

      if (stored && typeof stored === 'object') {
        setState({ filters: { ...DEFAULT_FILTERS, ...stored }, filtersLoaded: true });
      } else {
        setState({ filtersLoaded: true });
      }
    } catch (e) {
      // Never crash the app because filters failed
      setState({ filters: { ...DEFAULT_FILTERS }, filtersLoaded: true });
      if (__DEV__) console.warn('[playerPortalStore] hydrateFilters failed:', e);
    }
  },

  setFilters(key, partial) {
    const next = {
      ...portalState.filters,
      [key]: { ...(portalState.filters[key] || {}), ...(partial || {}) },
    };
    setState({ filters: next });
    persistFilters().catch((e) => __DEV__ && console.warn('[playerPortalStore] persistFilters failed:', e));
  },

  async clearFilters(key) {
    const next = {
      ...portalState.filters,
      [key]: { ...(DEFAULT_FILTERS[key] || {}) },
    };
    setState({ filters: next });
    try {
      await persistFilters();
    } catch (e) {
      if (__DEV__) console.warn('[playerPortalStore] persistFilters failed:', e);
    }
  },

  // ---- Data ----
  async fetchOverview() {
    setState({ overviewLoading: true, overviewError: null });
    const res = await playerPortalApi.getOverview();

    if (res.success) {
      setState({ overview: res.data, overviewLoading: false, overviewError: null });
      await persistTryOutIdFromOverview(res.data);
      return { success: true, data: res.data };
    }

    const normalized = normalizeApiError(res.error);
    setState({ overviewLoading: false, overviewError: normalized });
    return { success: false, error: res.error };
  },

  async fetchProfile() {
    setState({ profileLoading: true, profileError: null });
    const res = await playerPortalApi.getProfile();

    if (res.success) {
      setState({ profile: res.data, profileLoading: false, profileError: null });
      return { success: true, data: res.data };
    }

    const normalized = normalizeApiError(res.error);
    setState({ profileLoading: false, profileError: normalized });
    return { success: false, error: res.error };
  },

  async fetchPayments() {
    setState({ paymentsLoading: true, paymentsError: null });
    const res = await playerPortalApi.listPayments();

    if (res.success) {
      setState({ payments: res.data || [], paymentsLoading: false, paymentsError: null });
      return { success: true, data: res.data };
    }

    const normalized = normalizeApiError(res.error);
    setState({ paymentsLoading: false, paymentsError: normalized });
    return { success: false, error: res.error };
  },

  async fetchOrders(payload = {}) {
    setState({ ordersLoading: true, ordersError: null });
    const res = await playerPortalApi.listOrders(null, payload);

    if (res.success) {
      setState({ orders: res.data || [], ordersLoading: false, ordersError: null });
      return { success: true, data: res.data };
    }

    const normalized = normalizeApiError(res.error);
    setState({ ordersLoading: false, ordersError: normalized });
    return { success: false, error: res.error };
  },

  async fetchRenewals(payload = {}) {
    setState({ renewalsLoading: true, renewalsError: null });
    const res = await playerPortalApi.listRenewals(null, payload);

    if (res.success) {
      const data = res.data?.data || res.data || [];
      setState({ renewals: data, renewalsLoading: false, renewalsError: null });
      return { success: true, data };
    }

    const normalized = normalizeApiError(res.error);
    setState({ renewalsLoading: false, renewalsError: normalized });
    return { success: false, error: res.error };
  },

  async submitRenewal(payload = {}) {
    return playerPortalApi.submitRenewal(null, payload);
  },

  async printInvoice(payload = {}) {
    return playerPortalApi.printInvoice(null, payload);
  },

  // ---- Selectors ----
  selectFilteredPayments() {
    return applyPaymentFilters(portalState.payments, portalState.filters.payments);
  },

  // accept optional scope arg so your screens can call selectFilteredOrders('orders') safely
  selectFilteredOrders(_scope) {
    return applyOrderFilters(portalState.orders, portalState.filters.orders);
  },
};

export function usePlayerPortalStore(selector = (state) => state) {
  const [state, setLocalState] = useState(() => selector(playerPortalStore.getState()));

  useEffect(() => {
    const unsubscribe = playerPortalStore.subscribe((nextState) => {
      setLocalState(selector(nextState));
    });
    return unsubscribe;
  }, [selector]);

  return state;
}

export function usePlayerPortalActions() {
  return useMemo(
    () => ({
      hydrateFilters: playerPortalStore.hydrateFilters,
      setFilters: playerPortalStore.setFilters,
      clearFilters: playerPortalStore.clearFilters,
      fetchOverview: playerPortalStore.fetchOverview,
      fetchProfile: playerPortalStore.fetchProfile,
      fetchPayments: playerPortalStore.fetchPayments,
      fetchOrders: playerPortalStore.fetchOrders,
      fetchRenewals: playerPortalStore.fetchRenewals,
      submitRenewal: playerPortalStore.submitRenewal,
      printInvoice: playerPortalStore.printInvoice,
      selectFilteredPayments: playerPortalStore.selectFilteredPayments,
      selectFilteredOrders: playerPortalStore.selectFilteredOrders,
    }),
    []
  );
}
