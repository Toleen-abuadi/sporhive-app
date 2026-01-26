// src/services/portal/portal.store.js
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { storage, PORTAL_KEYS } from '../storage/storage';
import { portalApi } from './portal.api';
import { normalizePortalOverview } from './portal.normalize';
import { getTryOutIdFromPortalSession, isValidTryOutId, persistTryOutIdFromOverview } from './portal.tryout';

const INITIAL_STATE = {
  isAuthenticated: false,
  isLoading: true,
  academyId: null,
  authTokens: null,
  token: null,
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

export function PortalProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const [isInitialized, setIsInitialized] = useState(false);

  const clearStorage = useCallback(async () => {
    if (storage.logoutPortal) {
      await storage.logoutPortal();
    } else {
      await storage.removeItem(PORTAL_KEYS.AUTH_TOKENS);
      await storage.removeItem(PORTAL_KEYS.SESSION);
    }
    portalStore.clear();
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const [sessionRaw, tokensRaw, academyIdRaw] = await Promise.all([
        storage.getItem(PORTAL_KEYS.SESSION),
        storage.getItem(PORTAL_KEYS.AUTH_TOKENS),
        storage.getItem(PORTAL_KEYS.ACADEMY_ID),
      ]);

      const session = safeJsonParse(sessionRaw);
      const tokens = safeJsonParse(tokensRaw);
      const academyIdFromStorage = academyIdRaw != null ? Number(academyIdRaw) : null;
      const academyIdFromSession = session?.academyId != null ? Number(session.academyId) : null;
      const academyId = academyIdFromStorage || academyIdFromSession || null;
      const token = tokens?.access || tokens?.token || tokens?.access_token || null;
      const player = session?.player || null;
      const storedTryOutId = getTryOutIdFromPortalSession(session);
      const playerId = player?.id ?? player?.player_id ?? player?.external_player_id ?? null;
      const isInvalidTryOutId =
        !isValidTryOutId(storedTryOutId) ||
        (playerId != null && String(storedTryOutId) === String(playerId));
      const tryOutId = isInvalidTryOutId ? null : storedTryOutId;

      if (isInvalidTryOutId && session) {
        const cleanedSession = { ...session };
        delete cleanedSession.tryOutId;
        delete cleanedSession.try_out_id;
        delete cleanedSession.tryout_id;
        if (storage.setPortalSession) {
          await storage.setPortalSession(cleanedSession);
        } else {
          await storage.setItem(PORTAL_KEYS.SESSION, cleanedSession);
        }
      }

      setState({
        ...INITIAL_STATE,
        isAuthenticated: Boolean(token),
        isLoading: false,
        academyId,
        authTokens: tokens || null,
        token,
        tryOutId,
        player,
      });

      if (isInvalidTryOutId && token && academyId) {
        const refreshed = await portalStore.loadOverview({ academyId, silent: true });
        const refreshedTryOutId = refreshed?.data?.player?.tryOutId ?? null;
        if (isValidTryOutId(refreshedTryOutId)) {
          setState((prev) => ({ ...prev, tryOutId: refreshedTryOutId }));
        }
      }

      return { success: Boolean(token) };
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to load portal session:', error);
      }
      setState({ ...INITIAL_STATE, isLoading: false });
      return { success: false, error };
    } finally {
      setIsInitialized(true);
    }
  }, [clearStorage]);

  // Load persisted session on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const setAcademyId = useCallback(async (academyId) => {
    const id = academyId == null ? null : Number(academyId);
    if (storage.setPortalAcademyId) {
      await storage.setPortalAcademyId(id);
    } else if (id) {
      await storage.setItem(PORTAL_KEYS.ACADEMY_ID, String(id));
    }
    setState((prev) => ({ ...prev, academyId: id }));
  }, []);

  const login = useCallback(async ({ academyId, username, password }) => {
    const id = Number(academyId);
    setState((prev) => ({ ...prev, isLoading: true, error: null, academyId: id }));
    if (storage.setPortalAcademyId) {
      await storage.setPortalAcademyId(id);
    } else {
      await storage.setItem(PORTAL_KEYS.ACADEMY_ID, String(id));
    }

    const result = await portalApi.login({ academyId: id, username, password });

    if (result.success) {
      if (storage.setPortalCredentials) {
        await storage.setPortalCredentials({ username, password });
      } else {
        await storage.setItem(PORTAL_KEYS.USERNAME, String(username || ''));
        await storage.setItem(PORTAL_KEYS.PASSWORD, String(password || ''));
      }
      const data = result.data || {};
      const tokens = data.tokens || data;
      const token = tokens?.access || tokens?.token || tokens?.access_token || null;
      const playerInfo = data.player || data.player_info || data.user || {};
      const tryOutId = isValidTryOutId(data.try_out_id || data.tryOutId) ? data.try_out_id || data.tryOutId : null;
      if (storage.setPortalTokens) {
        await storage.setPortalTokens(tokens);
      } else {
        await storage.setItem(PORTAL_KEYS.AUTH_TOKENS, tokens);
      }
      const sessionPayload = {
        player: playerInfo,
        academyId: id,
        ...(isValidTryOutId(tryOutId) ? { tryOutId } : {}),
      };
      if (storage.setPortalSession) {
        await storage.setPortalSession(sessionPayload);
      } else {
        await storage.setItem(PORTAL_KEYS.SESSION, sessionPayload);
      }
      if (storage.setPortalAcademyId) {
        await storage.setPortalAcademyId(id);
      } else {
        await storage.setItem(PORTAL_KEYS.ACADEMY_ID, String(id));
      }

      setState({
        isAuthenticated: true,
        isLoading: false,
        academyId: id,
        authTokens: tokens,
        token,
        tryOutId: isValidTryOutId(tryOutId) ? tryOutId : null,
        player: playerInfo,
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

  const resetPassword = useCallback(async ({ academyId, username, phoneNumber }) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const customerId = academyId ? Number(academyId) : state.academyId;
    if (customerId) {
      if (storage.setPortalAcademyId) {
        await storage.setPortalAcademyId(customerId);
      } else {
        await storage.setItem(PORTAL_KEYS.ACADEMY_ID, String(customerId));
      }
    }

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
    if (result.success) {
      const t = result?.data?.player?.tryOutId ?? null;
      if (isValidTryOutId(t) && t !== state.tryOutId) {
        setState((prev) => ({ ...prev, tryOutId: t }));
      }
      return result;
    }
    return { success: false, error: result.error };
  }, [state.academyId, state.tryOutId]);


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
    const result = await portalApi.renewalsEligibility(payload);
    return result;
  }, []);

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
    const result = await portalApi.getRatingTypes(payload);

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
      restoreSession,
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
    [state, isInitialized, login, logout, restoreSession, resetPassword, setAcademyId, refreshOverview, updateProfile, submitFreeze, checkRenewalsEligibility, submitRenewal, placeUniformOrder, refreshUniformOrders, submitFeedback]
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
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
