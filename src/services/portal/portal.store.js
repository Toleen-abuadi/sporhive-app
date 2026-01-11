// src/services/portal/portal.store.js
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { storage, PORTAL_KEYS } from '../storage/storage';
import { portalApi } from './portal.api';
import { normalizePortalOverview } from './portal.normalize';

const INITIAL_STATE = {
  isAuthenticated: false,
  isLoading: true,
  academyId: null,
  authTokens: null,
  tryOutId: null,
  player: null,
  error: null,
  overview: null,
};

const PortalContext = createContext(null);

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
    const res = await portalApi.fetchOverview({ academyId });
    if (!res?.success) {
      portalStore.setState({ loading: false, error: res?.error || new Error('Failed to load overview') });
      return { success: false, error: res?.error };
    }
    const normalized = normalizePortalOverview(res.data);
    portalStore.setOverview(normalized);
    return { success: true, data: normalized };
  },
  refreshOverview: async ({ academyId } = {}) => portalStore.loadOverview({ academyId, silent: true }),
};

export function PortalProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const [isInitialized, setIsInitialized] = useState(false);

  const clearStorage = useCallback(async () => {
    await storage.removeItem(PORTAL_KEYS.AUTH_TOKENS);
    await storage.removeItem(PORTAL_KEYS.SESSION);
    portalStore.clear();
  }, []);

  // Load persisted session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const authTokens = await storage.getItem(PORTAL_KEYS.AUTH_TOKENS);
        const academyIdRaw = await storage.getItem(PORTAL_KEYS.ACADEMY_ID);
        const session = await storage.getItem(PORTAL_KEYS.SESSION);

        const academyId = academyIdRaw ? Number(academyIdRaw) : null;
        const tokens = authTokens && typeof authTokens === 'string' ? safeJsonParse(authTokens) : authTokens;

        if (!tokens?.access || !academyId) {
          setState({ ...INITIAL_STATE, isLoading: false, academyId: academyId || null });
          return;
        }

        const me = await portalApi.me({ academyId });

        if (me.success) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            academyId,
            authTokens: tokens,
            tryOutId: session?.tryOutId || null,
            player: session?.player || null,
            error: null,
          });
        } else {
          await clearStorage();
          setState({ ...INITIAL_STATE, isLoading: false, academyId: academyId || null });
        }
      } catch (error) {
        console.error('Failed to load portal session:', error);
        setState({ ...INITIAL_STATE, isLoading: false });
      } finally {
        setIsInitialized(true);
      }
    };

    loadSession();
  }, [clearStorage]);

  const setAcademyId = useCallback(async (academyId) => {
    const id = academyId == null ? null : Number(academyId);
    if (id) await storage.setItem(PORTAL_KEYS.ACADEMY_ID, String(id));
    setState((prev) => ({ ...prev, academyId: id }));
  }, []);

  const login = useCallback(async ({ academyId, username, password }) => {
    const id = Number(academyId);
    setState((prev) => ({ ...prev, isLoading: true, error: null, academyId: id }));
    await storage.setItem(PORTAL_KEYS.ACADEMY_ID, String(id));

    const result = await portalApi.login({ academyId: id, username, password });

    if (result.success) {
      const data = result.data || {};
      const tokens = data.tokens || data;
      const playerInfo = data.player || data.player_info || data.user || {};
      const tryOutId = data.try_out_id || data.tryOutId || null;
      await storage.setItem(PORTAL_KEYS.AUTH_TOKENS, tokens);
      await storage.setItem(PORTAL_KEYS.SESSION, { player: playerInfo, tryOutId, academyId: id });
      await storage.setItem(PORTAL_KEYS.ACADEMY_ID, String(id));

      setState({
        isAuthenticated: true,
        isLoading: false,
        academyId: id,
        authTokens: tokens,
        tryOutId,
        player: playerInfo,
        error: null,
      });

      return { success: true };
    }

    const errorMsg = result.message || result.error?.message || 'Invalid credentials';
    setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
    return { success: false, error: errorMsg };
  }, []);

  const logout = useCallback(async () => {
    try {
      await clearStorage();
      setState({ ...INITIAL_STATE, isLoading: false });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [clearStorage]);

  const resetPassword = useCallback(async ({ academyId, username, phoneNumber }) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const customerId = academyId ? Number(academyId) : state.academyId;
    if (customerId) await storage.setItem(PORTAL_KEYS.ACADEMY_ID, String(customerId));

    const result = await portalApi.passwordResetRequest({ academyId: customerId, username, phoneNumber });

    if (result.success) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: true };
    }

    const errorMsg = result.message || result.error?.message || 'Password reset request failed';
    setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
    return { success: false, error: errorMsg };
  }, [state.academyId]);

  const refreshOverview = useCallback(async () => {
    const result = await portalStore.refreshOverview({ academyId: state.academyId });
    if (result.success) return result;
    return { success: false, error: result.error };
  }, [state.academyId]);

  const updateProfile = useCallback(async (payload) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const result = await portalApi.updateProfile(payload);

    if (result.success) {
      await refreshOverview();
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: true };
    }

    const errorMsg = result.message || result.error?.message || 'Profile update failed';
    setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
    return { success: false, error: errorMsg };
  }, [refreshOverview]);

  const submitFreeze = useCallback(async (payload) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const result = await portalApi.requestFreeze(payload);

    if (result.success) {
      await refreshOverview();
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: true, data: result.data };
    }

    const errorMsg = result.message || result.error?.message || 'Freeze request failed';
    setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
    return { success: false, error: errorMsg };
  }, [refreshOverview]);

  const checkRenewalsEligibility = useCallback(async (payload = {}) => {
    const result = await portalApi.getRenewalsEligibility(payload);
    return result;
  }, []);

  const submitRenewal = useCallback(async (payload) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const result = await portalApi.requestRenewal(payload);

    if (result.success) {
      await refreshOverview();
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: true, data: result.data };
    }

    const errorMsg = result.message || result.error?.message || 'Renewal request failed';
    setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
    return { success: false, error: errorMsg };
  }, [refreshOverview]);

  const placeUniformOrder = useCallback(async (payload) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const result = await portalApi.createUniformOrder(payload);

    if (result.success) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: true, data: result.data };
    }

    const errorMsg = result.message || result.error?.message || 'Uniform order failed';
    setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
    return { success: false, error: errorMsg };
  }, []);

  const refreshUniformOrders = useCallback(async (payload = {}) => {
    const result = await portalApi.listMyUniformOrders(payload);
    return result;
  }, []);

  const submitFeedback = useCallback(async (payload) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const result = await portalApi.getFeedbackTypes(payload);

    if (result.success) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: true };
    }

    const errorMsg = result.message || result.error?.message || 'Feedback submission failed';
    setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
    return { success: false, error: errorMsg };
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isInitialized,
      login,
      logout,
      resetPassword,
      setAcademyId,
      refreshOverview,
      updateProfile,
      submitFreeze,
      checkRenewalsEligibility,
      submitRenewal,
      placeUniformOrder,
      refreshUniformOrders,
      submitFeedback,
    }),
    [state, isInitialized, login, logout, resetPassword, setAcademyId, refreshOverview, updateProfile, submitFreeze, checkRenewalsEligibility, submitRenewal, placeUniformOrder, refreshUniformOrders, submitFeedback]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within a PortalProvider');
  return ctx;
}

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

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
