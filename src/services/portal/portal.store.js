// src/services/portal/portal.store.js
import { portalApi } from '../api/playerPortalApi';
import { normalizePortalOverview } from './portal.normalize';
import { persistTryOutIdFromOverview } from './portal.tryout';

const OVERVIEW_INITIAL = {
  overview: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

/**
 * Lightweight in-memory store for caching overview & cross-screen refresh
 */
let _portalStoreState = { ...OVERVIEW_INITIAL };
const _listeners = new Set();

export const portalStore = {
  getState: () => _portalStoreState,
  subscribe: (fn) => {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
  _emit: () => {
    for (const fn of _listeners) fn(_portalStoreState);
  },
  setState: (patch) => {
    _portalStoreState = { ..._portalStoreState, ...patch };
    portalStore._emit();
  },
  setOverview: (overview) => {
    portalStore.setState({
      overview,
      loading: false,
      error: null,
      lastUpdated: overview ? new Date().toISOString() : _portalStoreState.lastUpdated,
    });
  },
  clear: () => {
    _portalStoreState = { ...OVERVIEW_INITIAL };
    portalStore._emit();
  },
  loadOverview: async ({ academyId, silent = false } = {}) => {
    portalStore.setState({ loading: !silent, error: null });
    const res = await portalApi.getOverview({ academyId });
    if (!res?.success) {
      portalStore.setState({ loading: false, error: res?.error || new Error('Failed to load overview') });
      return { success: false, error: res?.error };
    }
    const normalized = normalizePortalOverview(res.data);
    portalStore.setOverview(normalized);

    await persistTryOutIdFromOverview(normalized, academyId);
    return { success: true, data: normalized };

  },
  refreshOverview: async ({ academyId } = {}) => portalStore.loadOverview({ academyId, silent: true }),
};

export const selectPaymentsSorted = (overview, direction = 'desc') => {
  const list = Array.isArray(overview?.payments) ? overview.payments.slice() : [];
  list.sort((a, b) => {
    const da = new Date(a?.dueDate || 0).getTime();
    const db = new Date(b?.dueDate || 0).getTime();
    return direction === 'asc' ? da - db : db - da;
  });
  return list;
};

export const selectPaymentSummary = (overview) => {
  const payments = Array.isArray(overview?.payments) ? overview.payments : [];
  const paid = payments.filter((p) => String(p?.status || '').toLowerCase().includes('paid'));
  const pending = payments.filter((p) => {
    const status = String(p?.status || '').toLowerCase();
    return status.includes('pending') || status.includes('due');
  });
  const nextDue = pending
    .filter((p) => p?.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
  return {
    paidCount: paid.length,
    pendingCount: pending.length,
    nextDue,
  };
};

export const selectSubscriptionHistory = (overview) => {
  const list = Array.isArray(overview?.subscriptionHistory) ? overview.subscriptionHistory.slice() : [];
  list.sort((a, b) => new Date(b?.startDate || 0) - new Date(a?.startDate || 0));
  return list;
};

export const selectHealthInfo = (overview) => overview?.health || { height: null, weight: null, timestamp: '' };

export const selectRegistration = (overview) => overview?.registration || {};

export const selectOverviewHeader = (overview) => ({
  academyName: overview?.academyName || '',
  playerName: overview?.player?.fullNameEn || overview?.player?.fullNameAr || '',
  avatar: overview?.player?.avatar || {},
});
