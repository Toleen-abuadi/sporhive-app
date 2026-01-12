import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../storage/storage';
import { portalApi } from './portal.api';
import { normalizePortalOverview } from './portal.normalize';

const INITIAL_STATE = {
  isAuthenticated: false,
  isLoading: true,
  academyId: null,
  token: null,
  player: null,
  overview: null,
  error: null,
};

const PortalContext = createContext(null);

const OVERVIEW_INITIAL = {
  overview: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

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
    await storage.logoutPortal();
    portalStore.clear();
  }, []);

  const restoreSession = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [academyId, tokens, session] = await Promise.all([
        storage.getPortalAcademyId(),
        storage.getPortalTokens(),
        storage.getPortalSession(),
      ]);

      const token = tokens?.access || tokens?.token || tokens?.access_token || null;

      if (!academyId || !token) {
        setState({ ...INITIAL_STATE, isLoading: false, academyId: academyId || null });
        return { success: false };
      }

      const me = await portalApi.authMe({ academyId });

      if (me.success) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          academyId,
          token,
          player: session?.player || me.data?.player || null,
          overview: null,
          error: null,
        });
        await portalStore.loadOverview({ academyId, silent: true });
        return { success: true };
      }

      await clearStorage();
      setState({ ...INITIAL_STATE, isLoading: false, academyId });
      return { success: false };
    } catch (error) {
      console.error('Failed to restore portal session:', error);
      setState({ ...INITIAL_STATE, isLoading: false });
      return { success: false, error };
    } finally {
      setIsInitialized(true);
    }
  }, [clearStorage]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const setAcademyId = useCallback(async (academyId) => {
    const id = academyId == null ? null : Number(academyId);
    await storage.setPortalAcademyId(id);
    setState((prev) => ({ ...prev, academyId: id }));
  }, []);

  const login = useCallback(async ({ academyId, username, password }) => {
    const id = Number(academyId);
    setState((prev) => ({ ...prev, isLoading: true, error: null, academyId: id }));
    await storage.setPortalAcademyId(id);

    const result = await portalApi.login({ academyId: id, username, password });

    if (result.success) {
      const data = result.data || {};
      const tokens = data.tokens || data;
      const token = tokens.access || tokens.token || tokens.access_token || null;
      const playerInfo = data.player || data.player_info || data.user || null;

      await storage.setPortalTokens(tokens);
      await storage.setPortalSession({ player: playerInfo, academyId: id });

      setState({
        isAuthenticated: true,
        isLoading: false,
        academyId: id,
        token,
        player: playerInfo,
        overview: null,
        error: null,
      });

      await portalStore.loadOverview({ academyId: id, silent: true });

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

  const refreshOverview = useCallback(async () => {
    const result = await portalStore.refreshOverview({ academyId: state.academyId });
    if (result.success) {
      setState((prev) => ({ ...prev, overview: result.data }));
    }
    return result;
  }, [state.academyId]);

  const getProfile = useCallback(async () => portalApi.getProfile(), []);

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

  const submitRenewal = useCallback(async (payload) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const result = await portalApi.renewalsRequest(payload);

    if (result.success) {
      await refreshOverview();
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: true, data: result.data };
    }

    const errorMsg = result.message || result.error?.message || 'Renewal request failed';
    setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
    return { success: false, error: errorMsg };
  }, [refreshOverview]);

  const value = useMemo(
    () => ({
      ...state,
      isInitialized,
      restoreSession,
      login,
      logout,
      setAcademyId,
      refreshOverview,
      getProfile,
      updateProfile,
      submitFreeze,
      submitRenewal,
    }),
    [state, isInitialized, restoreSession, login, logout, setAcademyId, refreshOverview, getProfile, updateProfile, submitFreeze, submitRenewal]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortalAuth() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortalAuth must be used within a PortalProvider');
  return ctx;
}

// Backwards compatibility
export function usePortal() {
  return usePortalAuth();
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
