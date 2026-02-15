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
 *
 * Key fixes:
 * - ✅ Single-flight lock: prevents infinite / concurrent overview calls.
 * - ✅ Defensive silent refresh: keeps UX smooth while still preventing spam.
 * - ✅ Always normalize payload (best-effort) without breaking existing callers.
 */
let _portalStoreState = { ...OVERVIEW_INITIAL };
const _listeners = new Set();

// ✅ Single-flight promise lock (prevents infinite loops + concurrent calls)
let _overviewPromise = null;

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
      lastUpdated: overview
        ? new Date().toISOString()
        : _portalStoreState.lastUpdated,
    });
  },

  clear: () => {
    _portalStoreState = { ...OVERVIEW_INITIAL };
    portalStore._emit();
  },

  /**
   * Load overview (optionally silent).
   * - academyId may be required by the backend proxy layer; we forward as-is.
   * - Uses a single-flight lock so repeated triggers won't spam the API.
   */
  loadOverview: async ({ academyId, silent = false } = {}) => {
    // ✅ If a request is already in-flight, return it (single-flight)
    if (_overviewPromise) return _overviewPromise;

    _overviewPromise = (async () => {
      // If silent, keep loading=false so screens don't flicker.
      // If not silent, show loading unless we already have overview.
      const hasCached = Boolean(_portalStoreState.overview);
      portalStore.setState({
        loading: silent ? false : !hasCached,
        error: null,
      });

      let res;
      try {
        res = await portalApi.getOverview({ academyId });
      } catch (e) {
        portalStore.setState({
          loading: false,
          error: e || new Error('Failed to load overview'),
        });
        return { success: false, error: e };
      }

      if (!res?.success) {
        portalStore.setState({
          loading: false,
          error: res?.error || new Error('Failed to load overview'),
        });
        return { success: false, error: res?.error };
      }

      // Normalize best-effort while preserving old behavior
      const raw = res.data;
      const normalized = normalizePortalOverview ? normalizePortalOverview(raw) : raw;

      portalStore.setOverview(normalized);

      // Persist tryout id best-effort (should not break overview render)
      try {
        await persistTryOutIdFromOverview(normalized, academyId);
      } catch {
        // ignore persistence failures to avoid breaking UX
      }

      return { success: true, data: normalized };
    })();

    try {
      return await _overviewPromise;
    } finally {
      _overviewPromise = null; // ✅ release lock
    }
  },

  refreshOverview: async ({ academyId } = {}) =>
    portalStore.loadOverview({ academyId, silent: true }),
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
  const paid = payments.filter((p) =>
    String(p?.status || '').toLowerCase().includes('paid')
  );
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
  const list = Array.isArray(overview?.subscriptionHistory)
    ? overview.subscriptionHistory.slice()
    : [];
  list.sort((a, b) => new Date(b?.startDate || 0) - new Date(a?.startDate || 0));
  return list;
};

export const selectHealthInfo = (overview) =>
  overview?.health || { height: null, weight: null, timestamp: '' };

export const selectRegistration = (overview) => overview?.registration || {};

export const selectOverviewHeader = (overview) => ({
  academyName: overview?.academyName || '',
  playerName:
    overview?.player?.fullNameEn ||
    overview?.player?.fullNameAr ||
    '',
  avatar: overview?.player?.avatar || {},
});
