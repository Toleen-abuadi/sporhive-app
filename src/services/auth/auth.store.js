import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { authApi } from "./auth.api";
import { refreshPortalSessionIfNeeded } from "./portalSession";
import { storage, APP_STORAGE_KEYS } from "../storage/storage";

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
const extractToken = (data) =>
  data?.token ||
  data?.access ||
  data?.access_token ||
  data?.accessToken ||
  data?.tokens?.access ||
  data?.tokens?.access_token ||
  data?.portal_tokens?.access || // 👈 common in your backend swagger
  data?.portal_tokens?.access_token ||
  null;

const extractUser = (data) =>
  data?.user || data?.profile || data?.player || data?.public_user || null;

const normalizeAcademyId = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const normalizeUserProfile = ({ user, loginAs, academyId, username }) => {
  const profile = user || {};
  const firstName =
    profile.first_name || profile.firstName || profile.given_name || "";
  const lastName =
    profile.last_name || profile.lastName || profile.family_name || "";
  const phone = profile.phone || profile.mobile || profile.phone_number || "";

  const resolvedAcademyId =
    loginAs === "player"
      ? Number(profile.academy_id || profile.academyId || academyId || 0) ||
        undefined
      : undefined;

  const externalPlayerId =
    profile.external_player_id ||
    profile.externalPlayerId ||
    profile.player_external_id ||
    profile.player_id ||
    undefined;

  const playerUsername =
    loginAs === "player"
      ? profile.player_username || profile.username || username || undefined
      : undefined;

  return {
    id: profile.id != null ? String(profile.id) : "",
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
    token: token || null,
  };

  if (loginAs === "player") {
    if (academyId != null) session.academyId = Number(academyId);
    if (username) session.username = username;
  }

  return session;
};

const tokenPreview = (token) => {
  if (!token) return null;
  const s = String(token);
  return s.length > 18 ? s.slice(0, 18) + "…" : s;
};

export function AuthProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  // ✅ one mount flag only (no duplicates)
  const mountedRef = useRef(false);

  // ✅ hydration single-flight (prevents double restore in React 18 dev)
  const hydratePromiseRef = useRef(null);

  // ✅ portal reauth single-flight
  const portalReauthInFlightRef = useRef(null);

  // ✅ prevent redundant restore right after a successful login
  // (helps with dev fast-refresh/layout reruns)
  const skipNextHydrateRef = useRef(false);

  // ✅ IMPORTANT: keep ONLY one mount/unmount effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;

      // React 18 dev StrictMode can "fake unmount" -> release hydration lock
      hydratePromiseRef.current = null;

      // release portal lock as well (safe)
      portalReauthInFlightRef.current = null;

      // reset skip flag
      skipNextHydrateRef.current = false;
    };
  }, []);

  // ✅ safe state update helper
  const safeSetState = useCallback((updater) => {
    if (!mountedRef.current) return;
    setState(updater);
  }, []);

  const persistSession = useCallback(async (session, token) => {
    // Avoid persisting any computed runtime-only fields
    const safeSession = session
      ? (() => {
          const { portal_tokens, portalAccessToken, ...rest } = session;
          return rest;
        })()
      : null;

    if (__DEV__) {
      console.log("[auth.persistSession]", {
        hasSession: !!safeSession,
        login_as: safeSession?.login_as,
        hasToken: !!token,
        tokenPreview: tokenPreview(token),
        sessionKeys: safeSession ? Object.keys(safeSession) : [],
      });
    }

    await storage.setItem(APP_STORAGE_KEYS.AUTH_SESSION, safeSession);

    // ✅ persist single auth token
    if (token != null) {
      await storage.setAuthToken(token);
    }
  }, []);

  const restoreSession = useCallback(() => {
    // ✅ Single-flight: if hydration already running, return the same promise
    if (hydratePromiseRef.current) return hydratePromiseRef.current;

    // ✅ If we *just* logged in and the layout re-renders, skip redundant hydration once
    if (skipNextHydrateRef.current) {
      if (__DEV__) console.log("[auth] restoreSession skipped (post-login guard)");
      skipNextHydrateRef.current = false;
      return Promise.resolve();
    }

    if (__DEV__) {
      console.log("[auth] restoreSession called", {
        inFlight: !!hydratePromiseRef.current,
        mounted: mountedRef.current,
      });
    }

    const withTimeout = (promise, ms, label) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`HYDRATION_TIMEOUT:${label}`)), ms)
        ),
      ]);

    hydratePromiseRef.current = (async () => {
      // start loader
      safeSetState((prev) => ({ ...prev, isHydrating: true, isLoading: true }));

      let hadSessionData = false;
      let didRestore = false;

      try {
        await withTimeout(storage.ensureSecureMigration(), 8000, "secure_migration");

        const [sessionRaw, lastAcademyRaw, storedToken] = await withTimeout(
          Promise.all([
            storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION),
            storage.getItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
            storage.getAuthToken(),
          ]),
          8000,
          "storage_reads"
        );

        const session =
          sessionRaw && typeof sessionRaw === "object" ? sessionRaw : null;

        hadSessionData = Boolean(session || storedToken || lastAcademyRaw != null);

        if (__DEV__) {
          console.log("[auth.restoreSession:storage]", {
            hasSession: !!session,
            hasStoredToken: !!storedToken,
            storedTokenPreview: tokenPreview(storedToken),
            lastAcademyRaw,
          });
        }

        const resolvedToken = session?.token || storedToken || null;

        const normalizedSession = session
          ? (() => {
              const { portal_tokens, portalAccessToken, ...rest } = session;
              return { ...rest, token: resolvedToken || session.token || null };
            })()
          : null;

        const lastSelectedAcademyId =
          lastAcademyRaw == null || String(lastAcademyRaw).trim() === ""
            ? null
            : Number(lastAcademyRaw);

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
          loginAs === "player"
            ? sessionAcademyId
            : loginAs
            ? lastSelectedAcademyId
            : null;

        const academySelectionChanged =
          nextLastSelectedAcademyId !== lastSelectedAcademyId;

        // If player and LAST_ACADEMY_ID missing, persist it
        if (
          loginAs === "player" &&
          nextLastSelectedAcademyId != null &&
          lastAcademyRaw == null
        ) {
          await storage.setItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID, nextLastSelectedAcademyId);
        }

        // Token persistence / cleanup
        if (resolvedToken) {
          await storage.setAuthToken(resolvedToken);
        } else {
          if (__DEV__) {
            console.warn("[auth.restoreSession:CLEARING_STORAGE]", {
              loginAs,
              hadSession: !!session,
              hadStoredToken: !!storedToken,
            });
          }

          await Promise.all([
            storage.removeAuthToken(),
            storage.removePortalTokens(),
            storage.removeItem(APP_STORAGE_KEYS.AUTH_SESSION),
            storage.removeItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
          ]);
        }

        // Tenant reset when academy changed (if supported)
        if (academySelectionChanged && storage.clearTenantState) {
          await storage.clearTenantState();
          if (nextLastSelectedAcademyId != null) {
            await storage.setItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID, nextLastSelectedAcademyId);
          }
        }

        // If we have session OR token -> restore authenticated state
        if (loginAs || resolvedToken) {
          // keep storage session normalized
          if (normalizedSession && normalizedSession !== session) {
            await storage.setItem(APP_STORAGE_KEYS.AUTH_SESSION, normalizedSession);
          }

          if (__DEV__) {
            console.log("[auth.restoreSession:SUCCESS]", {
              loginAs,
              hasResolvedToken: !!resolvedToken,
              tokenPreview: tokenPreview(resolvedToken),
              lastSelectedAcademyId: nextLastSelectedAcademyId,
            });
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
            error: null,
          });

          didRestore = true;
          return;
        }
      } catch (error) {
        if (__DEV__) console.warn("Failed to restore auth session", error);

        // hard reset storage on failure
        await Promise.all([
          storage.removeAuthToken(),
          storage.removePortalTokens(),
          storage.removeItem(APP_STORAGE_KEYS.AUTH_SESSION),
          storage.removeItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
        ]);
      } finally {
        // If restore did not succeed, ensure we always stop the loader
        if (__DEV__ && hadSessionData && !didRestore) {
          console.warn(
            "Cleared auth session during restore due to missing or invalid token."
          );
        }

        if (!didRestore) {
          safeSetState({ ...INITIAL_STATE, isLoading: false, isHydrating: false });
        }
      }
    })().finally(() => {
      hydratePromiseRef.current = null;

      if (__DEV__) {
        console.log("[auth] restoreSession finished", {
          inFlight: !!hydratePromiseRef.current,
          mounted: mountedRef.current,
        });
      }
    });

    return hydratePromiseRef.current;
  }, [safeSetState]);

  // hydrate on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const setLastSelectedAcademyId = useCallback(async (academyId) => {
    const id = academyId != null ? Number(academyId) : null;

    if (id == null) {
      await storage.removeItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID);
    } else {
      await storage.setItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID, String(id));
    }

    safeSetState((prev) => ({ ...prev, lastSelectedAcademyId: id }));
  }, [safeSetState]);

  const login = useCallback(
    async ({ loginAs, phone, password, academyId, username }) => {
      safeSetState((prev) => ({ ...prev, isLoading: true, error: null }));

      const payload = {
        login_as: loginAs,
        password,
      };

      if (loginAs === "public") payload.phone = phone;

      if (loginAs === "player") {
        payload.academy_id = Number(academyId);
        payload.username = username;
      }

      const result = await authApi.login(payload);

      if (__DEV__) {
        console.log("[auth.store] login result.success:", result?.success);
        console.log("[auth.store] login result.data keys:", Object.keys(result?.data || {}));
      }

      if (result.success) {
        const token = extractToken(result.data);

        if (__DEV__) {
          console.log("[auth.store] extracted token:", tokenPreview(token));
        }

        if (!token) {
          const err = new Error("LOGIN_TOKEN_MISSING");
          err.code = "LOGIN_TOKEN_MISSING";
          err.kind = "AUTH_TOKEN_MISSING";
          if (__DEV__) {
            console.warn("[auth.store] Login success but token missing. Response:", result.data);
          }
          safeSetState((prev) => ({ ...prev, isLoading: false, error: err }));
          return { success: false, error: err };
        }

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

        if (loginAs === "player") {
          await setLastSelectedAcademyId(academyId);
        }

        // ✅ portal uses SAME token
        const portalAccessToken = token || null;

        // ✅ prevent redundant restoreSession firing right after login due to rerenders
        skipNextHydrateRef.current = true;

        safeSetState((prev) => ({
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
            loginAs === "player" ? Number(academyId) : prev.lastSelectedAcademyId,
        }));

        if (__DEV__) {
          console.log("[auth.store] login SUCCESS state set", {
            loginAs,
            tokenPreview: tokenPreview(token),
            academyId: loginAs === "player" ? Number(academyId) : null,
          });
        }

        return { success: true, data: result.data };
      }

      const error = result?.error || new Error("Login failed");
      safeSetState((prev) => ({ ...prev, isLoading: false, error }));
      return { success: false, error };
    },
    [persistSession, setLastSelectedAcademyId, safeSetState]
  );

  /**
   * Keep this for compatibility, but portal auth should not depend on it anymore.
   * If it refreshes successfully, we keep session in sync.
   */
  const refreshPortalIfNeeded = useCallback(async () => {
    const result = await refreshPortalSessionIfNeeded(state.session);
    if (result?.success && result.session) {
      // ✅ even if session refresh provides a portal token, portal should still use main token
      safeSetState((prev) => ({
        ...prev,
        session: result.session,
        portalAccessToken: prev.token || result.session?.token || null,
      }));
    }
    return result;
  }, [state.session, safeSetState]);

  // ✅ Single-flight portal reauth
  const ensurePortalReauthOnce = useCallback(async () => {
    if (portalReauthInFlightRef.current) return portalReauthInFlightRef.current;

    portalReauthInFlightRef.current = (async () => {
      try {
        return await refreshPortalIfNeeded();
      } finally {
        portalReauthInFlightRef.current = null;
      }
    })();

    return portalReauthInFlightRef.current;
  }, [refreshPortalIfNeeded]);

  const logout = useCallback(async () => {
    if (__DEV__) console.log("[auth.logout] clearing auth + tenant storage");

    await Promise.all([
      storage.removeItem(APP_STORAGE_KEYS.AUTH_SESSION),
      storage.removeItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
      storage.removeAuthToken(),
      storage.removePortalTokens(),
      storage.removeLegacyPortalCredentials(),
      storage.clearTenantState ? storage.clearTenantState() : Promise.resolve(),
    ]);

    safeSetState({ ...INITIAL_STATE, isLoading: false });
  }, [safeSetState]);

  // ✅ explicit logins required by your screens
  const loginPublic = useCallback(
    ({ phone, password }) => login({ loginAs: "public", phone, password }),
    [login]
  );

  const loginPlayer = useCallback(
    ({ academyId, username, password }) =>
      login({ loginAs: "player", academyId, username, password }),
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
      ensurePortalReauthOnce,
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
      ensurePortalReauthOnce,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
