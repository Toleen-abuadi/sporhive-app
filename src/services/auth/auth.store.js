import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from './auth.api';
import { storage, APP_STORAGE_KEYS } from '../storage/storage';

const INITIAL_STATE = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  userType: null,
  token: null,
  portalAccessToken: null,
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
      if (session?.userType || token) {
        setState({
          ...INITIAL_STATE,
          isAuthenticated: Boolean(session?.userType || token),
          isLoading: false,
          user: session?.user || null,
          userType: session?.userType || null,
          token: token || session?.token || null,
          portalAccessToken: session?.portalAccessToken || null,
          lastSelectedAcademyId,
        });
        return;
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to restore auth session', error);
      }
    }
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const setLastSelectedAcademyId = useCallback(async (academyId) => {
    const id = academyId != null ? Number(academyId) : null;
    await storage.setItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID, id);
    setState((prev) => ({ ...prev, lastSelectedAcademyId: id }));
  }, []);

  const loginPublic = useCallback(async ({ phone, password }) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const result = await authApi.login({
      login_as: 'public',
      phone,
      password,
    });

    if (result.success) {
      const token = extractToken(result.data);
      const user = extractUser(result.data);
      const session = {
        user,
        userType: 'public',
        token,
        portalAccessToken: null,
      };
      await persistSession(session, token);
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        user,
        userType: 'public',
        token,
        portalAccessToken: null,
      }));
      return { success: true, data: result.data };
    }

    const error = result?.error || new Error('Login failed');
    setState((prev) => ({ ...prev, isLoading: false, error }));
    return { success: false, error };
  }, [persistSession]);

  const loginPlayer = useCallback(
    async ({ academyId, username, password }) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const result = await authApi.login({
        login_as: 'player',
        academy_id: Number(academyId),
        username,
        password,
      });

      if (result.success) {
        const portalAccessToken =
          result.data?.portal_tokens?.access ||
          result.data?.portal_tokens?.access_token ||
          null;
        const token = extractToken(result.data);
        const user = extractUser(result.data);
        const session = {
          user,
          userType: 'player',
          token,
          portalAccessToken,
        };
        await Promise.all([
          persistSession(session, token),
          setLastSelectedAcademyId(academyId),
        ]);
        setState((prev) => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
          user,
          userType: 'player',
          token,
          portalAccessToken,
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
    setState({ ...INITIAL_STATE, isLoading: false });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      loginPublic,
      loginPlayer,
      logout,
      restoreSession,
      setLastSelectedAcademyId,
    }),
    [state, loginPublic, loginPlayer, logout, restoreSession, setLastSelectedAcademyId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
