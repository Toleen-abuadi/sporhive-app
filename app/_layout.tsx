// app/_layout.tsx (or app/_layout.js)
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";

import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { ThemeProvider as AppThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { I18nProvider } from "../src/services/i18n/i18n";
import { ToastProvider } from "../src/components/ui/ToastHost";

function NavThemeBridge({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();

  const navTheme = {
    dark: isDark,
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
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
        <ToastProvider>
          <NavThemeBridge>
            <Stack screenOptions={{ headerShown: false }} />
            <StatusBar style="auto" />
          </NavThemeBridge>
        </ToastProvider>
      </I18nProvider>
    </AppThemeProvider>
  );
}
