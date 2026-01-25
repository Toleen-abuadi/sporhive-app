import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from './auth.api';
import { getPortalAccessToken, refreshPortalSessionIfNeeded } from './portalSession';
import { storage, APP_STORAGE_KEYS } from '../storage/storage';

const INITIAL_STATE = {
  isAuthenticated: false,
  isLoading: true,
  session: null,
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

const normalizeUserProfile = ({ user, loginAs, academyId, username }) => {
  const profile = user || {};
  const firstName = profile.first_name || profile.firstName || profile.given_name || '';
  const lastName = profile.last_name || profile.lastName || profile.family_name || '';
  const phone = profile.phone || profile.mobile || profile.phone_number || '';
  const resolvedAcademyId =
    loginAs === 'player'
      ? Number(profile.academy_id || profile.academyId || academyId || 0) || undefined
      : undefined;
  const externalPlayerId =
    profile.external_player_id ||
    profile.externalPlayerId ||
    profile.player_external_id ||
    profile.player_id ||
    undefined;
  const playerUsername = loginAs === 'player'
    ? profile.player_username || profile.username || username || undefined
    : undefined;

  return {
    id: profile.id != null ? String(profile.id) : '',
    type: loginAs,
    first_name: firstName,
    last_name: lastName,
    phone,
    academy_id: resolvedAcademyId,
    external_player_id: externalPlayerId,
    player_username: playerUsername,
  };
};

const buildSession = ({ loginAs, user, token, portalTokens, academyId, username }) => {
  const normalizedUser = normalizeUserProfile({
    user,
    loginAs,
    academyId,
    username,
  });

  return {
    login_as: loginAs,
    user: normalizedUser,
    portal_tokens: portalTokens || undefined,
    token: token || undefined,
  };
};

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
      const loginAs = session?.login_as || session?.userType || session?.user?.type || null;
      const portalAccessToken = getPortalAccessToken(session);
      if (loginAs || token) {
        setState({
          ...INITIAL_STATE,
          isAuthenticated: Boolean(loginAs || token),
          isLoading: false,
          session: session || null,
          user: session?.user || null,
          userType: loginAs,
          token: token || session?.token || null,
          portalAccessToken,
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
      const session = buildSession({
        loginAs: 'public',
        user,
        token,
        portalTokens: null,
      });
      await persistSession(session, token);
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        session,
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
        const portalTokens = result.data?.portal_tokens || result.data?.portalTokens || null;
        const portalAccessToken =
          portalTokens?.access ||
          portalTokens?.access_token ||
          result.data?.portal_tokens?.access ||
          result.data?.portal_tokens?.access_token ||
          null;
        const token = extractToken(result.data);
        const user = extractUser(result.data);
        const session = buildSession({
          loginAs: 'player',
          user,
          token,
          portalTokens: portalTokens || (portalAccessToken ? { access: portalAccessToken } : null),
          academyId,
          username,
        });
        await Promise.all([
          persistSession(session, token),
          setLastSelectedAcademyId(academyId),
        ]);
        setState((prev) => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
          session,
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

  const refreshPortalIfNeeded = useCallback(async () => {
    const result = await refreshPortalSessionIfNeeded(state.session);
    if (result?.success && result.session) {
      const portalAccessToken = getPortalAccessToken(result.session);
      setState((prev) => ({
        ...prev,
        session: result.session,
        portalAccessToken,
      }));
    }
    return result;
  }, [state.session]);

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
      refreshPortalSessionIfNeeded: refreshPortalIfNeeded,
    }),
    [state, loginPublic, loginPlayer, logout, restoreSession, setLastSelectedAcademyId, refreshPortalIfNeeded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
