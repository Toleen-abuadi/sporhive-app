// src/services/portal/portal.store.js
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { storage, PORTAL_KEYS } from '../storage/storage';
import { portalApi } from './portal.api';

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

/**
 * Lightweight in-memory store for caching overview & cross-screen refresh
 */
let _portalStoreState = { overview: null };
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
  setOverview: (overview) => {
    _portalStoreState = { ..._portalStoreState, overview };
    portalStore._emit();
  },
  clear: () => {
    _portalStoreState = { overview: null };
    portalStore._emit();
  },
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
      console.log('PORTAL LOGIN RAW RESPONSE =>', result);
      const data = result.data || {};
      const tokens = data.tokens || data;
      const playerInfo = data.player || data.player_info || data.user || {};
      const tryOutId = data.try_out_id || data.tryOutId || null;
      console.log('PORTAL LOGIN TOKENS BEFORE SAVE =>', tokens);
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

    const result = await portalApi.passwordResetRequest({ customerId, username, phoneNumber });

    if (result.success) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: true };
    }

    const errorMsg = result.message || result.error?.message || 'Password reset request failed';
    setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
    return { success: false, error: errorMsg };
  }, [state.academyId]);

  const refreshOverview = useCallback(async () => {
    const result = await portalApi.getOverview({ customerId: state.academyId });
    if (result.success) {
      portalStore.setOverview(result.data);
      return { success: true, data: result.data };
    }
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
    // Note: Add feedback submission endpoint when available
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

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
