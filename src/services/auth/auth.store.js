import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from './auth.api';
import { storage, APP_STORAGE_KEYS } from '../storage/storage';

const INITIAL_STATE = {
  isAuthenticated: false,
  isHydrating: true,
  isLoading: false,
  session: null,
  token: null,
  lastSelectedAcademyId: null,
  error: null,
};

const AuthContext = createContext(null);

const extractToken = (data) =>
  data?.token ||
  data?.access_token ||
  data?.access ||
  data?.tokens?.access ||
  data?.tokens?.token ||
  null;

const extractUser = (data) =>
  data?.user || data?.profile || data?.player || data?.public_user || null;

export function AuthProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  const persistSession = useCallback(async (session, token) => {
    await storage.setItem(APP_STORAGE_KEYS.AUTH_SESSION, session);
    if (token) {
      await storage.setAuthToken(token);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const [session, lastAcademyRaw, token] = await Promise.all([
        storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION),
        storage.getItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
        storage.getAuthToken(),
      ]);
      const lastSelectedAcademyId = lastAcademyRaw != null ? Number(lastAcademyRaw) : null;
      if (session?.login_as || token) {
        setState({
          ...INITIAL_STATE,
          isAuthenticated: Boolean(session?.login_as || token),
          isHydrating: false,
          isLoading: false,
          session: session || null,
          token: token || session?.token || null,
          lastSelectedAcademyId,
        });
        return;
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to restore auth session', error);
      }
    }
    setState((prev) => ({ ...prev, isHydrating: false, isLoading: false }));
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const setLastSelectedAcademyId = useCallback(async (academyId) => {
    const id = academyId != null ? Number(academyId) : null;
    await storage.setItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID, id);
    setState((prev) => ({ ...prev, lastSelectedAcademyId: id }));
  }, []);

  const login = useCallback(
    async (payload) => {
      setState((prev) => ({ ...prev, isHydrating: false, isLoading: true, error: null }));
      const result = await authApi.login(payload);

      if (result.success) {
        const token = extractToken(result.data);
        const rawUser = extractUser(result.data) || {};
        const roles = Array.isArray(result.data?.roles) ? result.data.roles : [];
        const portalTokens = result.data?.portal_tokens || null;
        const loginAs = payload?.login_as || 'public';
        const academyId =
          rawUser?.academy_id ??
          rawUser?.academyId ??
          result.data?.academy_id ??
          payload?.academy_id ??
          null;
        const externalPlayerId =
          rawUser?.external_player_id ??
          rawUser?.externalPlayerId ??
          result.data?.external_player_id ??
          result.data?.player_id ??
          rawUser?.player_id ??
          null;
        const session = {
          user: {
            type: loginAs === 'player' ? 'player' : 'public',
            first_name: rawUser?.first_name ?? rawUser?.firstName ?? '',
            last_name: rawUser?.last_name ?? rawUser?.lastName ?? '',
            phone: rawUser?.phone ?? rawUser?.phone_number ?? '',
            academy_id: loginAs === 'player' ? Number(academyId || 0) || null : null,
            external_player_id: loginAs === 'player' ? externalPlayerId || null : null,
          },
          roles,
          portal_tokens: portalTokens,
          login_as: loginAs,
        };
        await persistSession(session, token);
        if (payload?.academy_id) {
          await setLastSelectedAcademyId(payload.academy_id);
        }
        setState((prev) => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
          session,
          token,
        }));
        return { success: true, data: result.data };
      }

      const error = result?.error || new Error('Login failed');
      setState((prev) => ({ ...prev, isLoading: false, error }));
      return { success: false, error };
    },
    [persistSession, setLastSelectedAcademyId]
  );

  const logout = useCallback(async () => {
    await Promise.all([
      storage.removeItem(APP_STORAGE_KEYS.AUTH_SESSION),
      storage.removeItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
      storage.removeAuthToken(),
    ]);
    setState({ ...INITIAL_STATE, isHydrating: false });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      restoreSession,
      setLastSelectedAcademyId,
    }),
    [state, login, logout, restoreSession, setLastSelectedAcademyId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
