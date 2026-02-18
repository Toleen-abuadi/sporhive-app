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
import { I18nProvider } from '../src/services/i18n/i18n';
import { ToastHost } from '../src/components/ui/ToastHost';
import { AppBottomNav } from '../src/components/navigation/AppBottomNav';
import { PortalModalsProvider } from '../src/services/portal/portal.modals';
import { AuthProvider, useAuth } from '../src/services/auth/auth.store';
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

  const { session, token, isAuthenticated, isHydrating, isLoading } = useAuth();

  const [welcomeSeen, setWelcomeSeen] = useState(null);
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);
  const [entryMode, setEntryMode] = useState(null);
  const [entryModeLoaded, setEntryModeLoaded] = useState(false);

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

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [seenState, storedEntryMode] = await withTimeout(
          Promise.all([
            getWelcomeSeenState(),
            getEntryMode(),
          ]),
          2000,
          'WELCOME_AND_ENTRY',
        );

        if (!mounted) return;
        
        // Sticky-true: do not downgrade to false/null in the same runtime.
        setWelcomeSeen((prev) => {
          if (prev === true) return true;
          if (seenState == null) return prev ?? false;
          return seenState;
        });

        setEntryMode((prev) => {
          const normalized = storedEntryMode || null;
          if (
            (prev === ENTRY_MODE_VALUES.PLAYER || prev === ENTRY_MODE_VALUES.PUBLIC) &&
            !normalized
          ) {
            return prev;
          }
          return normalized;
        });
      } catch (_error) {
        if (!mounted) return;
        setWelcomeSeen((prev) => (prev === true ? true : false));
        setEntryMode((prev) =>
          prev === ENTRY_MODE_VALUES.PLAYER || prev === ENTRY_MODE_VALUES.PUBLIC
            ? prev
            : null,
        );
      } finally {
        if (!mounted) return;
        setWelcomeLoaded(true);
        setEntryModeLoaded(true);
      }
    })();

    const hardFail = setTimeout(() => {
      if (!mounted) return;
      setWelcomeSeen((prev) => (prev === true ? true : prev ?? false));
      setEntryMode((prev) =>
        prev === ENTRY_MODE_VALUES.PLAYER || prev === ENTRY_MODE_VALUES.PUBLIC
          ? prev
          : null,
      );
      setWelcomeLoaded(true);
      setEntryModeLoaded(true);
    }, 2500);

    return () => {
      mounted = false;
      clearTimeout(hardFail);
    };
  }, [withTimeout]);

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
          if (prev === true && seenState !== true) {
            if (__DEV__) {
              console.warn('[AuthGate] welcomeSeen read downgraded after true; keeping sticky true', {
                pathname,
                seenState,
              });
            }
            return true;
          }
          if (seenState == null) {
            if (__DEV__ && prev === true) {
              console.warn('[AuthGate] welcomeSeen read null after true; keeping sticky true', {
                pathname,
              });
            }
            return prev;
          }
          return prev === seenState ? prev : seenState;
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

      lastRedirectRef.current = target;
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
      </View>
    ),
    [colors],
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
