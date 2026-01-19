// app/_layout.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";

import { useFrameworkReady } from "../hooks/useFrameworkReady";
import { ThemeProvider as AppThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { I18nProvider } from "../src/services/i18n/i18n";
import { ToastProvider } from "../src/components/ui/ToastHost";
import { PortalProvider } from "../src/services/portal/portal.store";

function NavThemeBridge({ children }) {
  const { colors, isDark } = useTheme();

  const base = isDark ? DarkTheme : DefaultTheme;

  // ✅ IMPORTANT: keep ...base so fonts stay defined (prevents "regular of undefined")
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

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AppThemeProvider>
      <I18nProvider>
        <PortalProvider>
          <ToastProvider>
            <NavThemeBridge>
              <Stack screenOptions={{ headerShown: false }} />
              <StatusBar style="auto" />
            </NavThemeBridge>
          </ToastProvider>
        </PortalProvider>
      </I18nProvider>
    </AppThemeProvider>
  );
}
