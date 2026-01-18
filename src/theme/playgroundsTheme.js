export const getPlaygroundsTheme = (mode = 'light') => {
  const isDark = mode === 'dark';
  const colors = {
    primary: '#FF7A00',
    primarySoft: '#FFF1E6',
    accent: '#FFB703',
    success: '#22C55E',
    error: '#EF4444',
    background: isDark ? '#0B0F14' : '#FFFFFF',
    surface: isDark ? '#111827' : '#F8F9FB',
    card: isDark ? '#0F172A' : '#FFFFFF',
    textPrimary: isDark ? '#F9FAFB' : '#1F2937',
    textMuted: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
    overlay: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(17, 24, 39, 0.6)',
  };

  const radius = {
    card: 22,
    button: 16,
    chip: 16,
    input: 14,
  };

  const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  };

  const typography = {
    title: 24,
    subtitle: 16,
    body: 14,
    meta: 12,
    price: 18,
    weightBold: '700',
    weightMedium: '500',
    weightRegular: '400',
  };

  const shadows = {
    soft: isDark
      ? {
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          elevation: 4,
        }
      : {
          shadowColor: '#0B1A33',
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          elevation: 3,
        },
  };

  return { colors, radius, spacing, typography, shadows };
};
