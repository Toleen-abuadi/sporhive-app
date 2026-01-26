// app/_layout.js
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";

import { useFrameworkReady } from "../hooks/useFrameworkReady";
import { ThemeProvider as AppThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { I18nProvider } from "../src/services/i18n/i18n";
import { ToastHost } from "../src/components/ui/ToastHost";
import { PortalModalsProvider } from "../src/services/portal/portal.modals";
import { AuthProvider } from "../src/services/auth/auth.store";
import { storage, APP_STORAGE_KEYS } from "../src/services/storage/storage";
import { useAuth } from "../src/services/auth/auth.store";

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

function AuthGate({ children }) {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();
  const { session, isHydrating } = useAuth();
  const [welcomeSeen, setWelcomeSeen] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadWelcomeSeen = async () => {
      const seen = await storage.getItem(APP_STORAGE_KEYS.WELCOME_SEEN);
      if (mounted) setWelcomeSeen(seen === true);
    };
    loadWelcomeSeen();
    return () => {
      mounted = false;
    };
  }, []);

  const isInAuthGroup = segments[0] === "(auth)";
  const isReady = welcomeSeen !== null && !isHydrating;

  useEffect(() => {
    if (!isReady) return;
    if (session && isInAuthGroup) {
      router.replace("/(app)/services");
      return;
    }
    if (!session && !isInAuthGroup) {
      router.replace(welcomeSeen ? "/(auth)/login" : "/(auth)/welcome");
      return;
    }
    if (!session && isInAuthGroup && welcomeSeen === false && segments[1] !== "welcome") {
      router.replace("/(auth)/welcome");
      return;
    }
  }, [isReady, isInAuthGroup, router, segments, session, welcomeSeen]);

  const fallback = useMemo(
    () => (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
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

  return (
    <AppThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <PortalModalsProvider>
            <ToastHost>
              <NavThemeBridge>
                <AuthGate>
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
