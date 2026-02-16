// src/services/portal/portal.store.js
import { playerPortalStore } from '../../stores/playerPortal.store';

const OVERVIEW_INITIAL = {
  overview: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

let _lastOverviewRef = null;
let _lastUpdated = null;

const mapOverviewState = (state = playerPortalStore.getState()) => {
  const overview = state?.overview || null;

  if (overview !== _lastOverviewRef) {
    _lastOverviewRef = overview;
    _lastUpdated = overview ? new Date().toISOString() : null;
  }

  return {
    overview,
    loading: !!state?.overviewLoading,
    error: state?.overviewError || null,
    lastUpdated: _lastUpdated,
  };
};

export const portalStore = {
  getState: () => mapOverviewState(playerPortalStore.getState()),

  subscribe: (fn) =>
    playerPortalStore.subscribe((next) => {
      fn(mapOverviewState(next));
    }),

  // Legacy compatibility no-op; SSOT state is managed by playerPortalStore.
  _emit: () => {},

  // Legacy compatibility no-op; SSOT state is managed by playerPortalStore.
  setState: () => {},

  // Legacy compatibility no-op; SSOT state is managed by playerPortalStore.
  setOverview: () => {},

  // Legacy compatibility no-op; SSOT state is managed by playerPortalStore.
  clear: () => {},

  loadOverview: async ({ academyId: _academyId, silent = false } = {}) =>
    playerPortalStore.fetchOverview({ force: !!silent }),

  refreshOverview: async ({ academyId: _academyId } = {}) => playerPortalStore.fetchOverview({ force: true }),
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

export const selectHealthInfo = (overview) =>
  overview?.health || { height: null, weight: null, timestamp: '' };

export const selectRegistration = (overview) => overview?.registration || {};

export const selectOverviewHeader = (overview) => ({
  academyName: overview?.academyName || '',
  playerName: overview?.player?.fullNameEn || overview?.player?.fullNameAr || '',
  avatar: overview?.player?.avatar || {},
});

export { OVERVIEW_INITIAL };
