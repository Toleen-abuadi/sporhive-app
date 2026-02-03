import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
 * - If older backend responses provide portal tokens, we keep them in session for backward compatibility,
 *   but they are not required for auth.
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

    // ✅ store the one token
    token: token || undefined,

    // kept for backward compatibility (no functional dependency)
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
    // Keep portal tokens if they exist (backward compat),
    // but portal auth will use `token` anyway.
    if (session?.portal_tokens) {
      await storage.setPortalTokens(session.portal_tokens);
    }

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
    let didSetTerminalState = false;

    const withTimeout = (promise, ms, label) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`HYDRATION_TIMEOUT:${label}`)), ms)
        ),
      ]);

    try {
      await withTimeout(storage.ensureSecureMigration(), 8000, 'secure_migration');

      const [session, lastAcademyRaw, storedToken, legacyToken, portalTokens] =
        await withTimeout(
          Promise.all([
            storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION),
            storage.getItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
            storage.getAuthToken(),
            storage.getLegacyAuthToken(),
            storage.getPortalTokens(),
          ]),
          8000,
          'storage_reads'
        );

      hadSessionData = Boolean(session || storedToken || legacyToken || lastAcademyRaw != null);

      // merge stored session + stored portal tokens (backward compat)
      const mergedSession = session
        ? {
          ...session,
          portal_tokens: portalTokens || session.portal_tokens,
        }
        : null;

      // legacy token candidates
      const legacySessionToken =
        mergedSession?.tokens?.access ||
        mergedSession?.tokens?.token ||
        mergedSession?.access ||
        mergedSession?.access_token ||
        mergedSession?.authToken ||
        null;

      // ✅ ONE TOKEN: prefer explicit session token, then legacy session token, then stored tokens
      const resolvedToken = mergedSession?.token || legacySessionToken || storedToken || legacyToken || null;

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
      if (loginAs === 'player' && nextLastSelectedAcademyId != null && lastAcademyRaw == null) {
        await storage.setItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID, nextLastSelectedAcademyId);
      }
      // ✅ PORTAL TOKEN POLICY:
      // portalAccessToken should be the same as main token.
      // Keep legacy fallback only if token missing for some reason.
      const legacyPortalAccessToken = getPortalAccessToken(normalizedSession);
      const portalAccessToken = resolvedToken || legacyPortalAccessToken || null;

      if (resolvedToken) {
        await storage.setAuthToken(resolvedToken);
        // ✅ If we have a valid main token, portal auth must not be driven by old portal token.
        // Keep portal tokens for backward compatibility, but pin access to main token.
        if (portalTokens && typeof portalTokens === 'object') {
          await storage.setPortalTokens({ ...portalTokens, access: resolvedToken });
        } else {
          // if no portal tokens exist, ensure secure storage doesn't keep an old one
          await storage.removePortalTokens();
        }
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

        didSetTerminalState = true;
        safeSetState({
          ...INITIAL_STATE,
          isAuthenticated: Boolean(loginAs || resolvedToken),
          isLoading: false,
          isHydrating: false,
          session: normalizedSession || null,
          user: normalizedSession?.user || null,
          userType: loginAs,
          token: resolvedToken,
          portalAccessToken, // ✅ same token
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
    didSetTerminalState = true;
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
        // keep portal tokens if backend returns them, but portal will use main token.
        const portalTokensRaw = result.data?.portal_tokens || result.data?.portalTokens || null;

        const token = extractToken(result.data);
        const user = extractUser(result.data);

        const session = buildSession({
          loginAs,
          user,
          token,
          portalTokens: portalTokensRaw,
          academyId,
          username,
        });

        if (storage.clearTenantState) {
          await storage.clearTenantState();
        }

        // ✅ persist single token
        await persistSession(session, token);

        // ✅ prevent stale portal tokens from overriding one-token policy:
        // if backend returned portal tokens, keep them, but ensure access mirrors the main token.
        // if no portal tokens, clear any old ones left in secure storage.
        if (token) {
          if (portalTokensRaw && typeof portalTokensRaw === 'object') {
            await storage.setPortalTokens({ ...portalTokensRaw, access: token });
          } else {
            await storage.removePortalTokens();
          }
        }

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
        portalAccessToken: prev.token || result.session?.token || getPortalAccessToken(result.session) || null,
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
