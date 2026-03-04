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
import { LOGOUT_REASONS } from "./logoutReasons";

const INITIAL_STATE = {
  isAuthenticated: false,
  isLoading: true,
  isHydrating: false,
  session: null,
  user: null,
  userType: null,

  // âœ… single source of truth token (public + player)
  token: null,

  // âœ… portal should use SAME token
  portalAccessToken: null,

  lastSelectedAcademyId: null,
  error: null,
};

const AuthContext = createContext(null);

/**
 * âœ… SINGLE TOKEN POLICY
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
  data?.portal_tokens?.access || // ðŸ‘ˆ common in your backend swagger
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

    // âœ… store the one token
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
  return s.length > 18 ? `${s.slice(0, 6)}...${s.slice(-4)}` : s;
};

const DEBUG_PORTAL_REAUTH = __DEV__;
const portalReauthBridge = { handler: null };

const nowIso = () => new Date().toISOString();

const authDevLog = (tag, payload = {}) => {
  if (!__DEV__) return;
  console.warn(`[AUTH][${tag}]`, {
    t: nowIso(),
    ...payload,
  });
};

const decodeBase64Url = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    if (typeof atob === "function") return atob(padded);
    if (typeof globalThis?.Buffer !== "undefined") {
      return globalThis.Buffer.from(padded, "base64").toString("utf8");
    }
  } catch {
    return null;
  }
  return null;
};

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;
  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const getTokenExpiryMs = (token) => {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp)) return null;
  return exp * 1000;
};

const getTokenTtlSec = (token) => {
  const expMs = getTokenExpiryMs(token);
  if (!expMs) return null;
  return Math.floor((expMs - Date.now()) / 1000);
};

const normalizePortalReason = (reason) => {
  const value = String(reason || "").trim().toLowerCase();
  if (!value) return "portal_reauth_failed";
  if (
    value === "token_expired" ||
    value === "expired" ||
    value === "tokenexpired" ||
    value === "auth_token_expired"
  ) {
    return "token_expired";
  }
  if (value === "token_missing" || value === "missing_portal_access") return "token_missing";
  return value;
};

const normalizePortalReauthResult = (result) => {
  if (result?.success) {
    return {
      success: true,
      session: result?.session || null,
      reason: normalizePortalReason(result?.reason || "ok"),
    };
  }
  return {
    success: false,
    reason: normalizePortalReason(result?.reason || result?.code || result?.kind || "portal_reauth_failed"),
    session: result?.session || null,
  };
};

export const runPortalReauthOnce = async (meta = {}) => {
  if (typeof portalReauthBridge.handler === "function") {
    return portalReauthBridge.handler(meta);
  }

  authDevLog("PORTAL_REAUTH", {
    mode: "fallback",
    source: meta?.source || null,
    reason: meta?.reason || null,
  });

  const result = await refreshPortalSessionIfNeeded();
  return normalizePortalReauthResult(result);
};
export function AuthProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  // âœ… one mount flag only (no duplicates)
  const mountedRef = useRef(false);

  // âœ… hydration single-flight (prevents double restore in React 18 dev)
  const hydratePromiseRef = useRef(null);

  // âœ… portal reauth single-flight
  const portalReauthInFlightRef = useRef(null);

  // âœ… prevent redundant restore right after a successful login
  // (helps with dev fast-refresh/layout reruns)
  const skipNextHydrateRef = useRef(false);

  // âœ… IMPORTANT: keep ONLY one mount/unmount effect
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

  // âœ… safe state update helper
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

    // âœ… persist single auth token
    if (token != null) {
      await storage.setAuthToken(token);
    }
  }, []);

  const restoreSession = useCallback(() => {
    // âœ… Single-flight: if hydration already running, return the same promise
    if (hydratePromiseRef.current) return hydratePromiseRef.current;

    // âœ… If we *just* logged in and the layout re-renders, skip redundant hydration once
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

        authDevLog("RESTORE", {
          hasSession: !!session,
          hasStoredToken: !!storedToken,
          storedTokenPreview: tokenPreview(storedToken),
          lastAcademyRaw,
          sessionKeys: session ? Object.keys(session) : [],
        });

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
          authDevLog("STORAGE_CLEAR", {
            reason: LOGOUT_REASONS.STORAGE_CORRUPT,
            loginAs,
            hadSession: !!session,
            hadStoredToken: !!storedToken,
            stack: new Error().stack,
          });

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
        authDevLog("LOGOUT", {
          reason: LOGOUT_REASONS.STORAGE_CORRUPT,
          error: String(error?.message || error),
          stack: new Error().stack,
        });

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

        authDevLog("LOGIN", {
          token: tokenPreview(token),
          exp: getTokenExpiryMs(token),
          now: Date.now(),
          ttlSec: getTokenTtlSec(token),
        });
        if (__DEV__) {
          const exp = getTokenExpiryMs(token);
          const now = Date.now();
          const ttlSec = getTokenTtlSec(token);
          console.info(
            `[AUTH][LOGIN] t=${nowIso()} token=${tokenPreview(token)} exp=${exp ?? 'NA'} now=${now} ttlSec=${ttlSec ?? 'NA'}`
          );
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

        // âœ… persist single token
        try {
          await persistSession(session, token);
        } catch (error) {
          if (__DEV__) {
            console.warn("[auth.store] failed to persist auth session/token", error);
          }
          safeSetState((prev) => ({ ...prev, isLoading: false, error }));
          return { success: false, error };
        }

        if (loginAs === "player") {
          await setLastSelectedAcademyId(academyId);
        }

        // âœ… portal uses SAME token
        const portalAccessToken = token || null;

        // âœ… prevent redundant restoreSession firing right after login due to rerenders
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
          // keep last selected academy id when logging public (donâ€™t wipe it)
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
  const logout = useCallback(async (options = {}) => {
    const reason = options?.reason || LOGOUT_REASONS.USER_LOGOUT;
    if (__DEV__) {
      console.warn(`[AUTH][LOGOUT] t=${nowIso()} reason=${reason}`, {
        stack: new Error().stack,
      });
    }
    authDevLog("LOGOUT", {
      reason,
      stack: new Error().stack,
    });

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

  const refreshPortalIfNeeded = useCallback(async () => {
    const result = await refreshPortalSessionIfNeeded();
    if (result?.success && result.session) {
      safeSetState((prev) => ({
        ...prev,
        session: result.session,
        portalAccessToken: prev.token || result.session?.token || null,
        user: result.session?.user || prev.user,
        userType: result.session?.login_as || prev.userType,
      }));
    }
    return normalizePortalReauthResult(result);
  }, [safeSetState]);

  const ensurePortalReauthOnce = useCallback(async (meta = {}) => {
    if (portalReauthInFlightRef.current) {
      if (DEBUG_PORTAL_REAUTH) {
        console.info("[auth.store] ensurePortalReauthOnce lock reused", meta);
        console.info("[PORTAL][REAUTH] reuse lock", {
          source: meta?.source || null,
          reason: normalizePortalReason(meta?.reason),
        });
      }
      return portalReauthInFlightRef.current;
    }

    if (DEBUG_PORTAL_REAUTH) {
      console.info("[auth.store] ensurePortalReauthOnce lock engaged", meta);
      console.info("[PORTAL][REAUTH] start", {
        source: meta?.source || null,
        reason: normalizePortalReason(meta?.reason),
      });
    }

    portalReauthInFlightRef.current = (async () => {
      try {
        const result = await refreshPortalIfNeeded();
        const normalized = normalizePortalReauthResult(result);
        if (DEBUG_PORTAL_REAUTH) {
          console.info("[auth.store] ensurePortalReauthOnce result", {
            success: normalized?.success === true,
            reason: normalized?.reason || null,
          });
          console.info("[PORTAL][REAUTH] end", {
            success: normalized?.success === true,
            reason: normalized?.reason || null,
          });
        }
        return normalized;
      } catch (error) {
        const normalized = {
          success: false,
          reason: normalizePortalReason(
            error?.reason || error?.code || error?.kind || error?.message || "portal_reauth_exception"
          ),
          session: null,
        };

        if (DEBUG_PORTAL_REAUTH) {
          console.warn("[auth.store] ensurePortalReauthOnce failure", {
            reason: normalized.reason,
          });
          console.info("[PORTAL][REAUTH] end", {
            success: false,
            reason: normalized.reason,
          });
        }
        return normalized;
      } finally {
        portalReauthInFlightRef.current = null;
      }
    })();

    return portalReauthInFlightRef.current;
  }, [refreshPortalIfNeeded]);

  useEffect(() => {
    portalReauthBridge.handler = ensurePortalReauthOnce;
    return () => {
      if (portalReauthBridge.handler === ensurePortalReauthOnce) {
        portalReauthBridge.handler = null;
      }
    };
  }, [ensurePortalReauthOnce]);

  // âœ… explicit logins required by your screens
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


