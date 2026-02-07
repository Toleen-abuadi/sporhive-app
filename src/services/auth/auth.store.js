import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from './auth.api';
import { refreshPortalSessionIfNeeded } from './portalSession';
import { storage, APP_STORAGE_KEYS } from '../storage/storage';

const INITIAL_STATE = {
  isAuthenticated: false,
  isLoading: true,
  isHydrating: false,
  session: null,
  user: null,
  userType: null,

  // ✅ single source of truth token (public + player)
  token: null,

  // ✅ portal should use SAME token
  portalAccessToken: null,

  lastSelectedAcademyId: null,
  error: null,
};

const AuthContext = createContext(null);

/**
 * ✅ SINGLE TOKEN POLICY
 * - We always extract the main token and store it in `token`.
 * - We set `portalAccessToken = token` (so portal requests use the same token).
 */
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

  const playerUsername =
    loginAs === 'player'
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

const buildSession = ({ loginAs, user, token, academyId, username }) => {
  const normalizedUser = normalizeUserProfile({
    user,
    loginAs,
    academyId,
    username,
  });

  const session = {
    login_as: loginAs,
    user: normalizedUser,

    // ✅ store the one token
    token: token || undefined,
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

  const mountedRef = useRef(false);
  const hydrateInFlightRef = useRef(false);

  const safeSetState = useCallback((updater) => {
    if (!mountedRef.current) return;
    setState(updater);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const persistSession = useCallback(async (session, token) => {
    // Avoid persisting any computed runtime-only fields
    const safeSession = session
      ? (() => {
        const { portal_tokens, portalAccessToken, ...rest } = session;
        return rest;
      })()
      : null;

    await storage.setItem(APP_STORAGE_KEYS.AUTH_SESSION, safeSession);

    // ✅ persist single auth token
    if (token) {
      await storage.setAuthToken(token);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    // Prevent re-entrant hydration loops (double restoreSession calls)
    if (hydrateInFlightRef.current) return;
    hydrateInFlightRef.current = true;

    safeSetState((prev) => ({ ...prev, isHydrating: true, isLoading: true }));
    let hadSessionData = false;

    const withTimeout = (promise, ms, label) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`HYDRATION_TIMEOUT:${label}`)), ms)
        ),
      ]);

    try {
      await withTimeout(storage.ensureSecureMigration(), 8000, 'secure_migration');

      const [sessionRaw, lastAcademyRaw, storedToken] =
        await withTimeout(
          Promise.all([
            storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION),
            storage.getItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
            storage.getAuthToken(),
          ]),
          8000,
          'storage_reads'
        );

      const session = sessionRaw && typeof sessionRaw === 'object' ? sessionRaw : null;
      hadSessionData = Boolean(session || storedToken || lastAcademyRaw != null);

      const resolvedToken = session?.token || storedToken || null;

      const normalizedSession = session
        ? (() => {
          const { portal_tokens, portalAccessToken, ...rest } = session;
          return {
            ...rest,
            token: resolvedToken || session.token,
          };
        })()
        : null;

      const lastSelectedAcademyId = lastAcademyRaw != null ? Number(lastAcademyRaw) : null;

      const loginAs =
        normalizedSession?.login_as ||
        normalizedSession?.userType ||
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
      if (loginAs === 'player' && nextLastSelectedAcademyId != null && lastAcademyRaw == null) {
        await storage.setItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID, nextLastSelectedAcademyId);
      }

      if (resolvedToken) {
        await storage.setAuthToken(resolvedToken);
      } else {
        await Promise.all([
          storage.removeAuthToken(),
          storage.removePortalTokens(),
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

        safeSetState({
          ...INITIAL_STATE,
          isAuthenticated: Boolean(loginAs || resolvedToken),
          isLoading: false,
          isHydrating: false,
          session: normalizedSession || null,
          user: normalizedSession?.user || null,
          userType: loginAs,
          token: resolvedToken,
          portalAccessToken: resolvedToken || null,
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
        storage.removeItem(APP_STORAGE_KEYS.AUTH_SESSION),
        storage.removeItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
      ]);
    }

    if (__DEV__ && hadSessionData) {
      console.warn('Cleared auth session during restore due to missing or invalid token.');
    }
    safeSetState({ ...INITIAL_STATE, isLoading: false, isHydrating: false });
  }, [safeSetState]);

  // Always resolve hydration flags even if an early return/throw happens above
  // (keeps app from getting stuck behind AuthGate)
  useEffect(() => {
    return () => {
      hydrateInFlightRef.current = false;
    };
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
        const token = extractToken(result.data);
        const user = extractUser(result.data);

        const session = buildSession({
          loginAs,
          user,
          token,
          academyId,
          username,
        });

        if (storage.clearTenantState) {
          await storage.clearTenantState();
        }

        // ✅ persist single token
        await persistSession(session, token);

        if (loginAs === 'player') {
          await setLastSelectedAcademyId(academyId);
        }

        // ✅ portal uses SAME token
        const portalAccessToken = token || null;

        setState((prev) => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
          session,
          user: session.user,
          userType: loginAs,
          token,
          portalAccessToken,
          // keep last selected academy id when logging public (don’t wipe it)
          lastSelectedAcademyId:
            loginAs === 'player' ? Number(academyId) : prev.lastSelectedAcademyId,
        }));

        return { success: true, data: result.data };
      }

      const error = result?.error || new Error('Login failed');
      setState((prev) => ({ ...prev, isLoading: false, error }));
      return { success: false, error };
    },
    [persistSession, setLastSelectedAcademyId]
  );

  /**
   * Keep this for compatibility, but portal auth should not depend on it anymore.
   * If it refreshes successfully, we keep session in sync.
   */
  const refreshPortalIfNeeded = useCallback(async () => {
    const result = await refreshPortalSessionIfNeeded(state.session);
    if (result?.success && result.session) {
      // ✅ even if session refresh provides a portal token, portal should still use main token
      setState((prev) => ({
        ...prev,
        session: result.session,
        portalAccessToken: prev.token || result.session?.token || null,
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

  // ✅ explicit logins required by your screens
  const loginPublic = useCallback(
    ({ phone, password }) => login({ loginAs: 'public', phone, password }),
    [login]
  );

  const loginPlayer = useCallback(
    ({ academyId, username, password }) =>
      login({ loginAs: 'player', academyId, username, password }),
    [login]
  );

  const value = useMemo(
    () => ({
      ...state,
      login,
      loginPublic,
      loginPlayer,
      logout,
      restoreSession,
      setLastSelectedAcademyId,
      refreshPortalSessionIfNeeded: refreshPortalIfNeeded,
    }),
    [
      state,
      login,
      loginPublic,
      loginPlayer,
      logout,
      restoreSession,
      setLastSelectedAcademyId,
      refreshPortalIfNeeded,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
