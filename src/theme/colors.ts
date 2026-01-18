export type ThemeMode = 'light' | 'dark';

export const palette = {
  light: {
    background: '#F6F7FB',
    surface: '#FFFFFF',
    surfaceElevated: '#F0F2F8',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    overlay: 'rgba(15, 23, 42, 0.45)',
    accent: '#F97316',
    accentStrong: '#EA580C',
    accentSoft: '#FFE8D6',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
  },
  dark: {
    background: '#0B1120',
    surface: '#0F172A',
    surfaceElevated: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5F5',
    textMuted: '#94A3B8',
    border: '#1F2937',
    overlay: 'rgba(15, 23, 42, 0.6)',
    accent: '#FB923C',
    accentStrong: '#F97316',
    accentSoft: '#3B2615',
    success: '#22C55E',
    warning: '#FBBF24',
    danger: '#F87171',
    info: '#60A5FA',
  },
};

export const getColors = (mode: ThemeMode = 'light') => palette[mode];

export type ThemeColors = typeof palette.light;
