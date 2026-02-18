// app/_layout.js
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';

import { useFrameworkReady } from '../hooks/useFrameworkReady';
import {
  ThemeProvider as AppThemeProvider,
  useTheme,
} from '../src/theme/ThemeProvider';
import { I18nProvider, useTranslation } from '../src/services/i18n/i18n';
import { ToastHost } from '../src/components/ui/ToastHost';
import { AppBottomNav } from '../src/components/navigation/AppBottomNav';
import { PortalModalsProvider } from '../src/services/portal/portal.modals';
import { AuthProvider, useAuth } from '../src/services/auth/auth.store';
import { Button } from '../src/components/ui/Button';
import { Text } from '../src/components/ui/Text';
import {
  ENTRY_MODE_VALUES,
  getEntryMode,
  getWelcomeSeenState,
} from '../src/services/storage/storage';

SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

SplashScreen.preventAutoHideAsync().catch(() => {});

const APP_HOME_ROUTE = '/(app)/services';
const AUTH_WELCOME_ROUTE = '/(auth)/welcome';
const AUTH_ENTRY_ROUTE = '/(auth)/entry';
const ONBOARDING_READ_TIMEOUT_MS = 7000;
const ONBOARDING_READ_RETRY_DELAY_MS = 250;
const REDIRECT_DEBOUNCE_MS = 300;

let hydrationStarted = false;
let onboardingReadPromise = null;
let lastRedirectAt = 0;
let lastRedirectTarget = null;

const stripQuery = (value) => {
  if (typeof value !== 'string') return '';
  const [path] = value.split('?');
  return path || '';
};

const isRouteMatch = (segments, pathname, target) => {
  const targetPath = stripQuery(target);

  if (targetPath === AUTH_WELCOME_ROUTE) {
    return segments?.[0] === '(auth)' && segments?.[1] === 'welcome';
  }

  if (targetPath === AUTH_ENTRY_ROUTE) {
    return segments?.[0] === '(auth)' && segments?.[1] === 'entry';
  }

  if (targetPath === '/(auth)/login') {
    return segments?.[0] === '(auth)' && segments?.[1] === 'login';
  }

  if (targetPath === APP_HOME_ROUTE) {
    return segments?.[0] === '(app)' && segments?.[1] === 'services';
  }

  return stripQuery(pathname) === targetPath;
};

function NavThemeBridge({ children }) {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;

  const navTheme = {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: colors.accentOrange,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accentOrange,
    },
  };

  return <ThemeProvider value={navTheme}>{children}</ThemeProvider>;
}

function AuthGate({ children, onReady }) {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const {
    session,
    token,
    isAuthenticated,
    isHydrating,
    isLoading,
    restoreSession,
  } = useAuth();

  const [welcomeSeen, setWelcomeSeen] = useState(null);
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);
  const [entryMode, setEntryMode] = useState(undefined);
  const [entryModeLoaded, setEntryModeLoaded] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [hydrationNonce, setHydrationNonce] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  const readyCalledRef = useRef(false);
  const navLockRef = useRef(false);
  const lastRedirectRef = useRef(null);
  const onboardingRefreshRef = useRef(false);

  const withTimeout = useCallback((promise, ms, label) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms),
      ),
    ]);
  }, []);

  const sleep = useCallback((ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  const loginRouteForEntryMode = useCallback((mode) => {
    if (mode === ENTRY_MODE_VALUES.PLAYER) {
      return '/(auth)/login?mode=player&lockMode=1';
    }
    return '/(auth)/login?mode=public&lockMode=1';
  }, []);

  const resolveUnauthTarget = useCallback(() => {
    if (welcomeSeen === false) {
      return AUTH_WELCOME_ROUTE;
    }

    if (
      entryMode === ENTRY_MODE_VALUES.PLAYER ||
      entryMode === ENTRY_MODE_VALUES.PUBLIC
    ) {
      return loginRouteForEntryMode(entryMode);
    }

    return AUTH_ENTRY_ROUTE;
  }, [entryMode, loginRouteForEntryMode, welcomeSeen]);

  const readOnboardingStateWithRetry = useCallback(
    (force = false) => {
      if (force) onboardingReadPromise = null;
      if (onboardingReadPromise) return onboardingReadPromise;

      hydrationStarted = true;
      onboardingReadPromise = (async () => {
        let lastError = null;

        for (let attempt = 1; attempt <= 2; attempt += 1) {
          try {
            const [seenState, storedEntryMode] = await withTimeout(
              Promise.all([
                getWelcomeSeenState(),
                getEntryMode(),
              ]),
              ONBOARDING_READ_TIMEOUT_MS,
              `WELCOME_AND_ENTRY_ATTEMPT_${attempt}`,
            );
            return { ok: true, seenState, storedEntryMode };
          } catch (error) {
            lastError = error;
            if (__DEV__) {
              console.warn('[AuthGate] onboarding state read failed', {
                attempt,
                error: String(error?.message || error),
              });
            }
            if (attempt < 2) {
              await sleep(ONBOARDING_READ_RETRY_DELAY_MS);
            }
          }
        }

        return { ok: false, error: lastError };
      })().finally(() => {
        hydrationStarted = false;
        onboardingReadPromise = null;
      });

      return onboardingReadPromise;
    },
    [sleep, withTimeout],
  );

  const retryHydration = useCallback(() => {
    if (typeof restoreSession === 'function') {
      restoreSession().catch(() => {});
    }
    setHydrationNonce((prev) => prev + 1);
  }, [restoreSession]);

  useEffect(() => {
    let mounted = true;
    setBootError(null);
    setWelcomeLoaded(false);
    setEntryModeLoaded(false);
    setWelcomeSeen((prev) => (prev === true ? true : null));
    setEntryMode((prev) =>
      prev === ENTRY_MODE_VALUES.PLAYER || prev === ENTRY_MODE_VALUES.PUBLIC
        ? prev
        : undefined,
    );

    (async () => {
      const result = await readOnboardingStateWithRetry(hydrationNonce > 0);
      if (!mounted) return;

      if (!result?.ok) {
        setBootError(result?.error || new Error('ONBOARDING_STATE_UNAVAILABLE'));
        return;
      }

      const normalizedWelcomeSeen = result.seenState === true;
      const normalizedEntryMode = result.storedEntryMode || null;

      // Sticky-true: do not downgrade to false in the same runtime.
      setWelcomeSeen((prev) => (prev === true ? true : normalizedWelcomeSeen));
      setEntryMode((prev) => {
        if (
          (prev === ENTRY_MODE_VALUES.PLAYER || prev === ENTRY_MODE_VALUES.PUBLIC) &&
          !normalizedEntryMode
        ) {
          return prev;
        }
        return normalizedEntryMode;
      });
      setBootError(null);
      setWelcomeLoaded(true);
      setEntryModeLoaded(true);
    })();

    return () => {
      mounted = false;
    };
  }, [hydrationNonce, readOnboardingStateWithRetry]);

  useEffect(() => {
    const hasNavigatorOnline =
      typeof globalThis?.navigator?.onLine === 'boolean';
    const hasWindowEvents =
      typeof globalThis?.addEventListener === 'function' &&
      typeof globalThis?.removeEventListener === 'function';

    if (!hasNavigatorOnline || !hasWindowEvents) return undefined;

    const updateOnlineState = () => {
      setIsOffline(globalThis.navigator.onLine === false);
    };

    updateOnlineState();
    globalThis.addEventListener('online', updateOnlineState);
    globalThis.addEventListener('offline', updateOnlineState);

    return () => {
      globalThis.removeEventListener('online', updateOnlineState);
      globalThis.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  const authReady = !isHydrating && !isLoading;
  const isReady = welcomeLoaded && entryModeLoaded && authReady;

  const signedIn = Boolean(isAuthenticated || token || session);

  const isInAuthGroup =
    segments?.[0] === '(auth)' ||
    (typeof pathname === 'string' && pathname.startsWith('/(auth)'));
  const segment0 = segments?.[0];
  const segment1 = segments?.[1];

  // Keep onboarding state in sync after welcome/entry interactions mutate storage.
  useEffect(() => {
    let mounted = true;

    if (!isInAuthGroup || signedIn) return;
    onboardingRefreshRef.current = true;

    (async () => {
      try {
        const [seenState, storedEntryMode] = await Promise.all([
          getWelcomeSeenState(),
          getEntryMode(),
        ]);

        if (!mounted) return;

        setWelcomeSeen((prev) => {
          const normalized = seenState === true;

          if (prev === true && normalized !== true) {
            if (__DEV__) {
              console.warn('[AuthGate] welcomeSeen read downgraded after true; keeping sticky true', {
                pathname,
                seenState,
              });
            }
            return true;
          }

          return prev === normalized ? prev : normalized;
        });

        setEntryMode((prev) => {
          const normalized = storedEntryMode || null;
          if (
            (prev === ENTRY_MODE_VALUES.PLAYER || prev === ENTRY_MODE_VALUES.PUBLIC) &&
            !normalized
          ) {
            if (__DEV__) {
              console.warn('[AuthGate] entryMode read null after selection; keeping sticky value', {
                pathname,
                prev,
              });
            }
            return prev;
          }
          return prev === normalized ? prev : normalized;
        });
      } catch {
        // Keep current in-memory state on transient storage errors.
      } finally {
        if (mounted) onboardingRefreshRef.current = false;
      }
    })();

    return () => {
      mounted = false;
      onboardingRefreshRef.current = false;
    };
  }, [isInAuthGroup, pathname, signedIn]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[AuthGate] readiness', {
      welcomeLoaded,
      entryModeLoaded,
      welcomeSeen,
      entryMode,
      isHydrating,
      isLoading,
      authReady,
      isReady,
      signedIn,
      segments,
      pathname,
      isInAuthGroup,
      bootError: bootError ? String(bootError?.message || bootError) : null,
      isOffline,
      hydrationStarted,
    });
  }, [
    welcomeLoaded,
    entryModeLoaded,
    welcomeSeen,
    entryMode,
    isHydrating,
    isLoading,
    authReady,
    isReady,
    signedIn,
    segments,
    pathname,
    isInAuthGroup,
    bootError,
    isOffline,
  ]);

  useEffect(() => {
    lastRedirectRef.current = null;
  }, [pathname, segment0, segment1]);

  const replaceWithGuard = useCallback(
    (target, reason) => {
      if (!target) return false;

      if (isRouteMatch(segments, pathname, target)) {
        if (__DEV__) {
          console.log('[AuthGate] redirect skipped (already on target)', {
            reason,
            target,
            pathname,
            segments,
          });
        }
        return false;
      }

      if (lastRedirectRef.current === target) {
        if (__DEV__) {
          console.log('[AuthGate] redirect skipped (throttled)', {
            reason,
            target,
            pathname,
            segments,
          });
        }
        return false;
      }

      const now = Date.now();
      if (
        lastRedirectTarget === target &&
        now - lastRedirectAt < REDIRECT_DEBOUNCE_MS
      ) {
        if (__DEV__) {
          console.log('[AuthGate] redirect skipped (global same target)', {
            reason,
            target,
            pathname,
            segments,
          });
        }
        return false;
      }

      if (now - lastRedirectAt < REDIRECT_DEBOUNCE_MS) {
        if (__DEV__) {
          console.log('[AuthGate] redirect skipped (global debounce)', {
            reason,
            target,
            pathname,
            segments,
            msSinceLast: now - lastRedirectAt,
          });
        }
        return false;
      }

      lastRedirectRef.current = target;
      lastRedirectAt = now;
      lastRedirectTarget = target;
      if (__DEV__) {
        console.log('[AuthGate] redirect', {
          reason,
          target,
          pathname,
          segments,
          welcomeSeen,
          entryMode,
          signedIn,
        });
      }
      router.replace(target);
      return true;
    },
    [entryMode, pathname, router, segments, signedIn, welcomeSeen],
  );

  useEffect(() => {
    if (!isReady) return;

    if (!readyCalledRef.current) {
      readyCalledRef.current = true;
      onReady?.();
    }

    if (onboardingRefreshRef.current) return;

    if (navLockRef.current) return;
    navLockRef.current = true;

    const unlock = () => {
      navLockRef.current = false;
    };

    const stuckAtRoot =
      (Array.isArray(segments) && segments.length === 0) ||
      pathname === '/' ||
      pathname == null;

    if (stuckAtRoot) {
      const target = signedIn ? APP_HOME_ROUTE : resolveUnauthTarget();

      if (__DEV__) {
        console.log('[AuthGate] boot redirect from root', {
          pathname,
          segments,
          signedIn,
          welcomeSeen,
          entryMode,
          target,
        });
      }

      if (replaceWithGuard(target, 'root')) {
        setTimeout(unlock, 250);
        return;
      }
      unlock();
      return;
    }

    if (signedIn && isInAuthGroup) {
      if (replaceWithGuard(APP_HOME_ROUTE, 'signed_in_inside_auth')) {
        setTimeout(unlock, 250);
        return;
      }
      unlock();
      return;
    }

    if (!signedIn && !isInAuthGroup) {
      if (replaceWithGuard(resolveUnauthTarget(), 'signed_out_outside_auth')) {
        setTimeout(unlock, 250);
        return;
      }
      unlock();
      return;
    }

    if (
      !signedIn &&
      isInAuthGroup &&
      welcomeLoaded &&
      welcomeSeen === false &&
      segment1 !== 'welcome'
    ) {
      if (replaceWithGuard(AUTH_WELCOME_ROUTE, 'welcome_required')) {
        setTimeout(unlock, 250);
        return;
      }
      unlock();
      return;
    }

    if (
      !signedIn &&
      isInAuthGroup &&
      welcomeSeen !== false &&
      !entryMode &&
      segment1 === 'login'
    ) {
      if (replaceWithGuard(AUTH_ENTRY_ROUTE, 'entry_mode_missing')) {
        setTimeout(unlock, 250);
        return;
      }
      unlock();
      return;
    }

    unlock();
  }, [
    isReady,
    signedIn,
    isInAuthGroup,
    segments,
    pathname,
    welcomeSeen,
    entryMode,
    welcomeLoaded,
    resolveUnauthTarget,
    onReady,
    replaceWithGuard,
    segment1,
  ]);

  const fallback = useMemo(
    () => (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accentOrange} />
        {(isOffline || bootError) ? (
          <View
            style={{
              marginTop: 16,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              paddingHorizontal: 20,
            }}
          >
            {isOffline ? (
              <Text variant="h4" weight="bold" style={{ textAlign: 'center' }}>
                {t('auth.offlineTitle')}
              </Text>
            ) : null}
            <Text
              variant="bodySmall"
              color={colors.textSecondary}
              style={{ textAlign: 'center' }}
            >
              {isOffline ? t('auth.offlineHint') : t('common.tryAgain')}
            </Text>
            <Button
              variant="secondary"
              size="small"
              onPress={retryHydration}
              style={{ minWidth: 140 }}
            >
              {t('auth.retry')}
            </Button>
          </View>
        ) : null}
      </View>
    ),
    [bootError, colors, isOffline, retryHydration, t],
  );

  if (!isReady) return fallback;
  return children;
}

export default function RootLayout() {
  useFrameworkReady();

  const [splashHidden, setSplashHidden] = useState(false);

  const hideSplash = useCallback(async () => {
    if (splashHidden) return;
    setSplashHidden(true);

    await SplashScreen.hideAsync();
  }, [splashHidden]);

  useEffect(() => {
    const t = setTimeout(() => {
      hideSplash();
    }, 3500);

    return () => clearTimeout(t);
  }, [hideSplash]);

  return (
    <AppThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <PortalModalsProvider>
            <ToastHost>
              <NavThemeBridge>
                <AuthGate onReady={hideSplash}>
                  <Stack screenOptions={{ headerShown: false }} />
                  <AppBottomNav />
                  <StatusBar style="auto" />
                </AuthGate>
              </NavThemeBridge>
            </ToastHost>
          </PortalModalsProvider>
        </AuthProvider>
      </I18nProvider>
    </AppThemeProvider>
  );
}
