import React from 'react';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { getColors, ThemeMode } from '../../theme/colors';
import { radius, typography } from '../../theme/tokens';

type ToastHostProps = {
  mode?: ThemeMode;
};

export function ToastHost({ mode = 'light' }: ToastHostProps) {
  const colors = getColors(mode);
  const toastConfig = {
    success: (props: React.ComponentProps<typeof BaseToast>) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: colors.success, borderRadius: radius.md }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{ fontSize: typography.size.sm, color: colors.textPrimary }}
        text2Style={{ fontSize: typography.size.xs, color: colors.textSecondary }}
      />
    ),
    error: (props: React.ComponentProps<typeof ErrorToast>) => (
      <ErrorToast
        {...props}
        style={{ borderLeftColor: colors.danger, borderRadius: radius.md }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{ fontSize: typography.size.sm, color: colors.textPrimary }}
        text2Style={{ fontSize: typography.size.xs, color: colors.textSecondary }}
      />
    ),
  };

  return <Toast config={toastConfig} />;
}
