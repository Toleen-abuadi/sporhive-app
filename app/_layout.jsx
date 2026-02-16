// app/_layout.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';

import { useFrameworkReady } from '../hooks/useFrameworkReady';
import {
  ThemeProvider as AppThemeProvider,
  useTheme,
} from '../src/theme/ThemeProvider';
import { I18nProvider } from '../src/services/i18n/i18n';
import { ToastHost } from '../src/components/ui/ToastHost';
import { PortalModalsProvider } from '../src/services/portal/portal.modals';
import { AuthProvider, useAuth } from '../src/services/auth/auth.store';
import {
  storage,
  APP_STORAGE_KEYS,
  ENTRY_MODE_VALUES,
  getEntryMode,
} from '../src/services/storage/storage';

SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

SplashScreen.preventAutoHideAsync().catch(() => {});

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

  const withTimeout = useCallback((promise, ms, label) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms)
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
      return '/(auth)/welcome';
    }

    if (entryMode === ENTRY_MODE_VALUES.PLAYER || entryMode === ENTRY_MODE_VALUES.PUBLIC) {
      return loginRouteForEntryMode(entryMode);
    }

    return '/(auth)/entry';
  }, [entryMode, loginRouteForEntryMode, welcomeSeen]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [seen, storedEntryMode] = await withTimeout(
          Promise.all([
            storage.getItem(APP_STORAGE_KEYS.WELCOME_SEEN),
            getEntryMode(),
          ]),
          2000,
          'WELCOME_AND_ENTRY'
        );

        if (!mounted) return;
        setWelcomeSeen(seen === true || seen === 'true');
        setEntryMode(storedEntryMode || null);
      } catch (_error) {
        if (!mounted) return;
        setWelcomeSeen(false);
        setEntryMode(null);
      } finally {
        if (!mounted) return;
        setWelcomeLoaded(true);
        setEntryModeLoaded(true);
      }
    })();

    const hardFail = setTimeout(() => {
      if (!mounted) return;
      setWelcomeSeen((prev) => (prev == null ? false : prev));
      setEntryMode((prev) =>
        prev === ENTRY_MODE_VALUES.PLAYER || prev === ENTRY_MODE_VALUES.PUBLIC ? prev : null
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
    if (!isReady) return;

    if (!readyCalledRef.current) {
      readyCalledRef.current = true;
      onReady?.();
    }

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
      const target = signedIn ? '/(app)/services' : resolveUnauthTarget();

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

      router.replace(target);
      setTimeout(unlock, 250);
      return;
    }

    if (signedIn && isInAuthGroup) {
      router.replace('/(app)/services');
      setTimeout(unlock, 250);
      return;
    }

    if (!signedIn && !isInAuthGroup) {
      router.replace(resolveUnauthTarget());
      setTimeout(unlock, 250);
      return;
    }

    if (
      !signedIn &&
      isInAuthGroup &&
      welcomeSeen === false &&
      segments?.[1] !== 'welcome'
    ) {
      router.replace('/(auth)/welcome');
      setTimeout(unlock, 250);
      return;
    }

    if (
      !signedIn &&
      isInAuthGroup &&
      welcomeSeen !== false &&
      !entryMode &&
      segments?.[1] === 'login'
    ) {
      router.replace('/(auth)/entry');
      setTimeout(unlock, 250);
      return;
    }

    unlock();
  }, [
    isReady,
    signedIn,
    isInAuthGroup,
    router,
    segments,
    pathname,
    welcomeSeen,
    entryMode,
    resolveUnauthTarget,
    onReady,
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
    [colors]
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

