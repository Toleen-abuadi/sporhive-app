import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from './auth.api';
import { getPortalAccessToken, refreshPortalSessionIfNeeded } from './portalSession';
import { storage, APP_STORAGE_KEYS } from '../storage/storage';

const INITIAL_STATE = {
  isAuthenticated: false,
  isLoading: true,
  isHydrating: false,
  session: null,
  user: null,
  userType: null,
  token: null,
  portalAccessToken: null,
  lastSelectedAcademyId: null,
  error: null,
};

const AuthContext = createContext(null);

const extractToken = (data) => data?.token || null;

const extractUser = (data) =>
  data?.user || data?.profile || data?.player || data?.public_user || null;

const normalizeAcademyId = (value) => (value != null ? Number(value) : null);

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

  const session = {
    login_as: loginAs,
    user: normalizedUser,
    token: token || undefined,
    portal_tokens: portalTokens || undefined,
  };

  if (loginAs === 'player') {
    if (academyId != null) {
      session.academyId = Number(academyId);
    }
    if (username) {
      session.username = username;
    }
  }

  return session;
};

export function AuthProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  const persistSession = useCallback(async (session, token) => {
    if (session?.portal_tokens) {
      await storage.setPortalTokens(session.portal_tokens);
    }
    const safeSession = session
      ? (() => {
          const { portal_tokens, portalAccessToken, ...rest } = session;
          return rest;
        })()
      : null;
    await storage.setItem(APP_STORAGE_KEYS.AUTH_SESSION, safeSession);
    if (token) {
      await storage.setAuthToken(token);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    setState((prev) => ({ ...prev, isHydrating: true, isLoading: true }));
    let hadSessionData = false;
    try {
      await storage.ensureSecureMigration();
      const [session, lastAcademyRaw, storedToken, legacyToken, portalTokens] = await Promise.all([
        storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION),
        storage.getItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
        storage.getAuthToken(),
        storage.getLegacyAuthToken(),
        storage.getPortalTokens(),
      ]);
      hadSessionData = Boolean(session || storedToken || legacyToken || lastAcademyRaw != null);
      const mergedSession = session
        ? {
            ...session,
            portal_tokens: portalTokens || session.portal_tokens,
          }
        : null;
      const legacySessionToken =
        mergedSession?.tokens?.access ||
        mergedSession?.tokens?.token ||
        mergedSession?.access ||
        mergedSession?.access_token ||
        mergedSession?.authToken ||
        null;
      const resolvedToken =
        mergedSession?.token ||
        legacySessionToken ||
        storedToken ||
        legacyToken ||
        null;
      const normalizedSession = mergedSession
        ? (() => {
            const cleaned = {
              ...mergedSession,
              token: resolvedToken || mergedSession.token,
            };
            delete cleaned.tokens;
            delete cleaned.access;
            delete cleaned.access_token;
            delete cleaned.authToken;
            delete cleaned.userType;
            return cleaned;
          })()
        : null;
      const lastSelectedAcademyId = lastAcademyRaw != null ? Number(lastAcademyRaw) : null;
      const loginAs =
        mergedSession?.login_as ||
        mergedSession?.userType ||
        normalizedSession?.login_as ||
        normalizedSession?.user?.type ||
        null;
      const sessionAcademyId = normalizeAcademyId(
        normalizedSession?.user?.academy_id ||
          normalizedSession?.user?.academyId ||
          normalizedSession?.academyId ||
          null
      );
      const nextLastSelectedAcademyId =
        loginAs === 'player'
          ? sessionAcademyId
          : loginAs
            ? lastSelectedAcademyId
            : null;
      const academySelectionChanged = nextLastSelectedAcademyId !== lastSelectedAcademyId;
      const portalAccessToken = getPortalAccessToken(normalizedSession);
      if (resolvedToken) {
        await storage.setAuthToken(resolvedToken);
        if (legacyToken) {
          await storage.removeLegacyAuthTokens();
        }
      } else {
        await Promise.all([
          storage.removeAuthToken(),
          storage.removePortalTokens(),
          storage.removeLegacyAuthTokens(),
          storage.removeLegacyPortalCredentials(),
          storage.removeItem(APP_STORAGE_KEYS.AUTH_SESSION),
          storage.removeItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
        ]);
      }
      if (academySelectionChanged && storage.clearTenantState) {
        await storage.clearTenantState();
        if (nextLastSelectedAcademyId != null) {
          await storage.setItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID, nextLastSelectedAcademyId);
        }
      }
      if (loginAs || resolvedToken) {
        if (normalizedSession && normalizedSession !== session) {
          await storage.setItem(APP_STORAGE_KEYS.AUTH_SESSION, normalizedSession);
        }
        setState({
          ...INITIAL_STATE,
          isAuthenticated: Boolean(loginAs || resolvedToken),
          isLoading: false,
          isHydrating: false,
          session: normalizedSession || null,
          user: normalizedSession?.user || null,
          userType: loginAs,
          token: resolvedToken,
          portalAccessToken,
          lastSelectedAcademyId: nextLastSelectedAcademyId,
        });
        return;
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to restore auth session', error);
      }
      await Promise.all([
        storage.removeAuthToken(),
        storage.removePortalTokens(),
        storage.removeLegacyAuthTokens(),
        storage.removeLegacyPortalCredentials(),
        storage.removeItem(APP_STORAGE_KEYS.AUTH_SESSION),
        storage.removeItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
      ]);
    }
    if (__DEV__ && hadSessionData) {
      console.warn('Cleared auth session during restore due to missing or invalid token.');
    }
    setState({ ...INITIAL_STATE, isLoading: false, isHydrating: false });
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
    async ({ loginAs, phone, password, academyId, username }) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const payload = {
        login_as: loginAs,
        password,
      };
      if (loginAs === 'public') {
        payload.phone = phone;
      }
      if (loginAs === 'player') {
        payload.academy_id = Number(academyId);
        payload.username = username;
      }

      const result = await authApi.login(payload);

      if (result.success) {
        const portalTokensRaw = result.data?.portal_tokens || result.data?.portalTokens || null;
        const portalAccessToken =
          portalTokensRaw?.access ||
          portalTokensRaw?.access_token ||
          result.data?.portal_tokens?.access ||
          result.data?.portal_tokens?.access_token ||
          result.data?.portalAccessToken ||
          result.data?.portal_access_token ||
          null;
        const portalTokens =
          portalTokensRaw || (portalAccessToken ? { access: portalAccessToken } : null);
        const token = extractToken(result.data);
        const user = extractUser(result.data);
        const session = buildSession({
          loginAs,
          user,
          token,
          portalTokens,
          academyId,
          username,
        });

        if (storage.clearTenantState) {
          await storage.clearTenantState();
        }
        await persistSession(session, token);
        if (loginAs === 'player') {
          await setLastSelectedAcademyId(academyId);
        }
        setState((prev) => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
          session,
          user: session.user,
          userType: loginAs,
          token,
          portalAccessToken,
          lastSelectedAcademyId: loginAs === 'player' ? Number(academyId) : null,
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
      storage.removePortalTokens(),
      storage.removeLegacyPortalCredentials(),
      storage.clearTenantState ? storage.clearTenantState() : Promise.resolve(),
    ]);
    setState({ ...INITIAL_STATE, isLoading: false });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      restoreSession,
      setLastSelectedAcademyId,
      refreshPortalSessionIfNeeded: refreshPortalIfNeeded,
    }),
    [state, login, logout, restoreSession, setLastSelectedAcademyId, refreshPortalIfNeeded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
