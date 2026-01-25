import { useEffect, useMemo, useState } from 'react';
import { playerPortalApi } from '../services/api/playerPortal.api';
import { storage } from '../services/storage/storage';
import { STORAGE_KEYS } from '../services/storage/keys';

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

const persistFilters = async () => {
  await storage.setItem(STORAGE_KEYS.PLAYER_PORTAL_FILTERS, portalState.filters);
};

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
  async hydrateFilters() {
    const stored = await storage.getItem(STORAGE_KEYS.PLAYER_PORTAL_FILTERS);
    if (stored && typeof stored === 'object') {
      setState({ filters: { ...DEFAULT_FILTERS, ...stored }, filtersLoaded: true });
    } else {
      setState({ filtersLoaded: true });
    }
  },
  setFilters(key, partial) {
    setState({
      filters: {
        ...portalState.filters,
        [key]: { ...(portalState.filters[key] || {}), ...(partial || {}) },
      },
    });
    persistFilters();
  },
  async clearFilters(key) {
    setState({
      filters: {
        ...portalState.filters,
        [key]: { ...(DEFAULT_FILTERS[key] || {}) },
      },
    });
    await persistFilters();
  },
  async fetchOverview() {
    setState({ overviewLoading: true, overviewError: null });
    const res = await playerPortalApi.getOverview();
    if (res.success) {
      setState({ overview: res.data, overviewLoading: false, overviewError: null });
      return { success: true, data: res.data };
    }
    setState({ overviewLoading: false, overviewError: res.error });
    return { success: false, error: res.error };
  },
  async fetchProfile() {
    setState({ profileLoading: true, profileError: null });
    const res = await playerPortalApi.getProfile();
    if (res.success) {
      setState({ profile: res.data, profileLoading: false, profileError: null });
      return { success: true, data: res.data };
    }
    setState({ profileLoading: false, profileError: res.error });
    return { success: false, error: res.error };
  },
  async fetchPayments() {
    setState({ paymentsLoading: true, paymentsError: null });
    const res = await playerPortalApi.listPayments();
    if (res.success) {
      setState({ payments: res.data || [], paymentsLoading: false, paymentsError: null });
      await persistFilters();
      return { success: true, data: res.data };
    }
    setState({ paymentsLoading: false, paymentsError: res.error });
    return { success: false, error: res.error };
  },
  async fetchOrders(payload = {}) {
    setState({ ordersLoading: true, ordersError: null });
    const res = await playerPortalApi.listOrders(null, payload);
    if (res.success) {
      setState({ orders: res.data || [], ordersLoading: false, ordersError: null });
      await persistFilters();
      return { success: true, data: res.data };
    }
    setState({ ordersLoading: false, ordersError: res.error });
    return { success: false, error: res.error };
  },
  async fetchRenewals(payload = {}) {
    setState({ renewalsLoading: true, renewalsError: null });
    const res = await playerPortalApi.listRenewals(null, payload);
    if (res.success) {
      const data = res.data?.data || res.data || [];
      setState({ renewals: data, renewalsLoading: false, renewalsError: null });
      await persistFilters();
      return { success: true, data };
    }
    setState({ renewalsLoading: false, renewalsError: res.error });
    return { success: false, error: res.error };
  },
  async submitRenewal(payload = {}) {
    return playerPortalApi.submitRenewal(null, payload);
  },
  async printInvoice(payload = {}) {
    return playerPortalApi.printInvoice(null, payload);
  },
  selectFilteredPayments() {
    return applyPaymentFilters(portalState.payments, portalState.filters.payments);
  },
  selectFilteredOrders() {
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
