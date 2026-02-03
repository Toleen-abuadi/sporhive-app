// app/_layout.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { PortalModalsProvider } from '../src/services/portal/portal.modals';
import { AuthProvider } from '../src/services/auth/auth.store';
import { storage, APP_STORAGE_KEYS } from '../src/services/storage/storage';
import { useAuth } from '../src/services/auth/auth.store';

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
  const { colors } = useTheme();
  const { session, isHydrating } = useAuth();
  const [welcomeSeen, setWelcomeSeen] = useState(null);
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const seen = await Promise.race([
          storage.getItem(APP_STORAGE_KEYS.WELCOME_SEEN),
          new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (!mounted) return;
        setWelcomeSeen(seen === true || seen === 'true');
      } catch (e) {
        if (!mounted) return;
        // Fail-safe: do not block the app behind welcome read failures
        setWelcomeSeen(false);
      } finally {
        if (!mounted) return;
        setWelcomeLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isInAuthGroup = segments[0] === '(auth)';
  const isReady = welcomeLoaded && !isHydrating;
  useEffect(() => {
    if (!isReady) return;

    onReady?.();

    if (session && isInAuthGroup) {
      router.replace('/(app)/services');
      return;
    }
    if (!session && !isInAuthGroup) {
      router.replace(welcomeSeen ? '/(auth)/login' : '/(auth)/welcome');
      return;
    }
    if (
      !session &&
      isInAuthGroup &&
      welcomeSeen === false &&
      segments[1] !== 'welcome'
    ) {
      router.replace('/(auth)/welcome');
      return;
    }
  }, [isReady, isInAuthGroup, router, segments, session, welcomeSeen, onReady]);

  // Safety fallback (rarely visible because splash stays up)
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
