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
import { storage, APP_STORAGE_KEYS } from '../src/services/storage/storage';

// ✅ Set splash animation options (Expo official API)
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

// ✅ Keep splash visible until we explicitly hide it
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

  // ✅ use auth flags, not only session
  const { session, token, isAuthenticated, isHydrating, isLoading } = useAuth();

  const [welcomeSeen, setWelcomeSeen] = useState(null);
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);

  // ✅ ensure onReady is called only once
  const readyCalledRef = useRef(false);

  // ✅ prevent duplicate replace calls
  const navLockRef = useRef(false);

  // ✅ hard timeout helper (prevents infinite loader)
  const withTimeout = useCallback((promise, ms, label) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms)
      ),
    ]);
  }, []);

  // ✅ Load welcome flag, but never block forever
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // if storage hangs, timeout and continue safely
        const seen = await withTimeout(
          storage.getItem(APP_STORAGE_KEYS.WELCOME_SEEN),
          2000,
          'WELCOME_SEEN'
        );

        if (!mounted) return;
        setWelcomeSeen(seen === true || seen === 'true');
      } catch (e) {
        if (!mounted) return;
        // Fail-safe: proceed as if welcome not seen
        setWelcomeSeen(false);
      } finally {
        if (!mounted) return;
        setWelcomeLoaded(true);
      }
    })();

    // ✅ absolute last-resort (even if promise never settles)
    const hardFail = setTimeout(() => {
      if (!mounted) return;
      setWelcomeSeen((prev) => (prev == null ? false : prev));
      setWelcomeLoaded(true);
    }, 2500);

    return () => {
      mounted = false;
      clearTimeout(hardFail);
    };
  }, [withTimeout]);

  // ✅ consider both flags (some apps keep isLoading true while hydrating)
  const authReady = !isHydrating && !isLoading;
  const isReady = welcomeLoaded && authReady;

  // ✅ treat token OR isAuthenticated OR session as "signed in"
  const signedIn = Boolean(isAuthenticated || token || session);

  // ✅ Segments can be [] on cold start. Use pathname fallback.
  const isInAuthGroup =
    segments?.[0] === '(auth)' ||
    (typeof pathname === 'string' && pathname.startsWith('/(auth)'));

  // ✅ debug readiness to find the stuck flag on reopen
  useEffect(() => {
    if (!__DEV__) return;
    console.log('[AuthGate] readiness', {
      welcomeLoaded,
      welcomeSeen,
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
    welcomeSeen,
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

    // ✅ call onReady exactly once
    if (!readyCalledRef.current) {
      readyCalledRef.current = true;
      onReady?.();
    }

    // ✅ avoid duplicate replace calls
    if (navLockRef.current) return;
    navLockRef.current = true;

    const unlock = () => {
      navLockRef.current = false;
    };

    // ✅ CRITICAL BOOT FIX:
    // Expo Router can sometimes stay on "/" with segments=[] during cold start.
    // If auth is ready, force a deterministic redirect.
    const stuckAtRoot =
      (Array.isArray(segments) && segments.length === 0) ||
      pathname === '/' ||
      pathname == null;

    if (stuckAtRoot) {
      const target = signedIn
        ? '/(app)/services'
        : welcomeSeen
        ? '/(auth)/login'
        : '/(auth)/welcome';

      if (__DEV__) {
        console.log('[AuthGate] boot redirect from root', {
          pathname,
          segments,
          signedIn,
          welcomeSeen,
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
      router.replace(welcomeSeen ? '/(auth)/login' : '/(auth)/welcome');
      setTimeout(unlock, 250);
      return;
    }

    if (
      !signedIn &&
      isInAuthGroup &&
      welcomeSeen === false &&
      segments?.[1] !== 'welcome' &&
      segments?.[1] !== 'login'
    ) {
      router.replace('/(auth)/welcome');
      setTimeout(unlock, 250);
      return;
    }

    unlock();
  }, [isReady, signedIn, isInAuthGroup, router, segments, pathname, welcomeSeen, onReady]);

  // ✅ Fallback loader
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

    // Hide using the configured animation options
    await SplashScreen.hideAsync();
  }, [splashHidden]);

  useEffect(() => {
    const t = setTimeout(() => {
      // ✅ last resort: never allow splash to block forever
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
