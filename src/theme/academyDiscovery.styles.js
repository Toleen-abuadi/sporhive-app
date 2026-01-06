// src/theme/academyDiscovery.styles.js
import { I18nManager, Platform } from 'react-native';

/**
 * Academy Discovery Design System (shared across discovery module screens)
 * - Dark-first, premium calm surfaces
 * - Soft borders + rounded cards
 * - Orange accent used sparingly
 * - RTL-safe tokens
 */

export const pressableScaleConfig = {
  in: { duration: 120, easing: 'out' },
  out: { duration: 160, easing: 'out' },
  from: 1,
  to: 0.97,
};

export function getShadow(level = 1, isDark = true) {
  // Keep it subtle and consistent across platforms
  // Use smaller Android elevation in dark mode
  const elevation = Math.max(0, Math.min(8, level * (isDark ? 1 : 1.2)));

  const ios = {
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.24 : 0.12,
    shadowRadius: level * 6,
    shadowOffset: { width: 0, height: level * 3 },
  };

  const android = { elevation: Platform.OS === 'android' ? elevation : 0 };

  return Platform.select({ ios, android, default: {} }) || {};
}

export function makeADTheme(colors, isDark) {
  // These are style “semantic tokens” so screens stay consistent.
  const baseBg = colors.background;
  const surface0 = isDark ? '#0B1220' : colors.background;
  const surface1 = colors.surface; // your theme already provides
  const surface2 = colors.surfaceElevated;
  const hairline = isDark ? 'rgba(255,255,255,0.08)' : colors.border;

  const orange = colors.accentOrange;

  const radius = {
    xs: 10,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    full: 999,
  };

  const space = {
    xxs: 6,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
  };

  const typography = {
    title: { fontSize: 22, lineHeight: 28 },
    subtitle: { fontSize: 13, lineHeight: 18 },
    sectionLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
    chip: { fontSize: 12, lineHeight: 16 },
  };

  return {
    isDark,
    dir: I18nManager.isRTL ? 'rtl' : 'ltr',
    alignStart: I18nManager.isRTL ? 'right' : 'left',
    alignEnd: I18nManager.isRTL ? 'left' : 'right',

    bg: baseBg,
    surface0,
    surface1,
    surface2,
    hairline,

    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
      muted: colors.textMuted,
      onDark: colors.white,
    },

    accent: {
      orange,
      orangeSoft: isDark ? 'rgba(255,149,0,0.10)' : '#FFF7ED',
      orangeHair: isDark ? 'rgba(255,149,0,0.22)' : 'rgba(255,149,0,0.18)',
    },

    radius,
    space,
    typography,

    shadow: {
      sm: getShadow(1, isDark),
      md: getShadow(2, isDark),
      lg: getShadow(3, isDark),
    },
  };
}

/**
 * Reusable style recipes used by Discovery module screens.
 * Keep these stable to ensure consistent premium look everywhere.
 */
export const ad = {
  // Layout containers
  screen: (t) => ({
    flex: 1,
    backgroundColor: t.bg,
  }),

  listContent: (t) => ({
    paddingBottom: t.space['2xl'],
  }),

  containerX: (t) => ({
    paddingHorizontal: t.space.lg,
  }),

  // Sticky header surface
  headerWrap: (t) => ({
    paddingTop: 0,
    backgroundColor: t.surface0,
    borderBottomWidth: 1,
    borderBottomColor: t.hairline,
  }),

  headerInner: (t) => ({
    paddingHorizontal: t.space.lg,
    paddingBottom: t.space.md,
  }),

  sectionRow: (t) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space.sm,
  }),

  // “Premium action”
  actionRow: (t) => ({
    flexDirection: 'row',
    gap: t.space.sm,
    marginTop: t.space.sm,
  }),

  actionBtn: () => ({
    flex: 1,
  }),

  // Search + sort blocks
  searchWrap: (t) => ({
    marginTop: t.space.md,
  }),

  sortWrap: (t) => ({
    marginTop: t.space.md,
  }),

  // Chips
  chipsSpacer: (t) => ({ height: t.space.md }),

  chipsContent: (t) => ({
    paddingTop: t.space.md,
    paddingBottom: t.space.md,
    gap: t.space.sm,
  }),

  chip: (t) => ({
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderColor: t.accent.orangeHair,
    backgroundColor: t.accent.orangeSoft,
  }),

  // Cards / list rows
  cardRow: (t) => ({
    paddingHorizontal: t.space.lg,
    marginBottom: t.space.lg,
  }),

  featuredWrap: (t) => ({
    borderRadius: t.radius.lg,
    padding: 1,
    backgroundColor: t.accent.orangeHair,
  }),

  // States
  stateWrap: (t) => ({
    paddingHorizontal: t.space.lg,
    paddingTop: t.space['2xl'],
    paddingBottom: t.space['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  }),

  // Bottom sheet
  sheetWrap: (t) => ({
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.sm,
    paddingBottom: t.space.lg,
  }),

  sheetHandle: (t) => ({
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: t.radius.full,
    backgroundColor: t.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)',
    marginBottom: t.space.md,
  }),

  sheetHeader: (t) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    marginBottom: t.space.lg,
  }),

  sheetHeaderLeft: () => ({ flex: 1 }),

  sheetCloseBtn: () => ({
    paddingHorizontal: 10,
  }),

  sheetBody: (t) => ({
    gap: t.space.md,
  }),

  sheetRow: (t) => ({
    flexDirection: 'row',
    gap: t.space.md,
  }),

  sheetCol: () => ({ flex: 1 }),

  togglesRow: (t) => ({
    flexDirection: 'row',
    gap: t.space.md,
  }),

  toggleChip: (t) => ({
    flex: 1,
    justifyContent: 'center',
    borderRadius: t.radius.full,
  }),

  hintBox: (t) => ({
    borderWidth: 1,
    borderColor: t.hairline,
    borderRadius: t.radius.md,
    padding: t.space.md,
    backgroundColor: t.isDark ? '#101B31' : '#F8FAFC',
  }),

  sheetActionsRow: (t) => ({
    flexDirection: 'row',
    gap: t.space.md,
    marginTop: t.space.sm,
  }),

  sheetActionBtn: () => ({ flex: 1 }),
};

// Optional helpers (allowed by your requirements)
export function chipStyles(theme) {
  return {
    pill: ad.chip(theme),
    text: { color: theme.text.primary },
  };
}

export function cardStyles(theme) {
  return {
    // Card container
    card: {
      borderWidth: 1,
      borderColor: theme.hairline,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: theme.surface2,
      ...theme.shadow.md,
    },

    // Cover block
    cover: {
      height: 148,
      overflow: 'hidden',
      backgroundColor: theme.surface1,
    },

    // Overlays
    badgeRow: {
      position: 'absolute',
      left: theme.space.md,
      top: theme.space.md,
      flexDirection: 'row',
      gap: theme.space.xs,
    },

    badgePill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
    },

    badgeInner: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    bottomOverlay: {
      position: 'absolute',
      left: theme.space.md,
      right: theme.space.md,
      bottom: theme.space.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: theme.space.sm,
    },

    bottomLeft: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.space.xs,
      flex: 1,
    },

    darkPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },

    distancePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
      backgroundColor: 'rgba(255,255,255,0.92)',
    },

    // Content block
    content: {
      padding: theme.space.md,
      paddingTop: theme.space.sm,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space.sm,
    },

    logoWrap: {
      width: 52,
      height: 52,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      borderWidth: 2,
      backgroundColor: theme.surface1,
    },

    logo: {
      width: '100%',
      height: '100%',
    },

    titleWrap: {
      flex: 1,
      minWidth: 0,
    },

    locRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },

    // Stats
    stats: {
      flexDirection: 'row',
      gap: theme.space.sm,
      marginTop: theme.space.md,
    },

    statBox: {
      flex: 1,
      borderRadius: theme.radius.md,
      padding: theme.space.sm,
      backgroundColor: theme.isDark ? '#101B31' : '#F8FAFC',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },

    statLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },

    // Actions
    actions: {
      flexDirection: 'row',
      gap: theme.space.sm,
      marginTop: theme.space.md,
      alignItems: 'center',
    },

    primaryBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: theme.radius.md,
    },

    secondaryBtn: {
      width: 96,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.hairline,
      backgroundColor: theme.surface1,
    },

    btnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    pressedOpacity: {
      opacity: 0.92,
    },
  };
}

// Safe (never-null) gradient fallbacks — avoids Android LinearGradient crashes due to null colors.
export function adGradients(theme) {
  return {
    coverFallback: theme.isDark ? ['#1A2642', '#0B1220'] : ['#FFEDD5', '#F8FAFC'],
    logoFallback: theme.isDark ? ['#2B3B5D', '#101B31'] : ['#FDBA74', '#F1F5F9'],
  };
}

export function adBadges(theme) {
  return {
    pro: {
      backgroundColor: theme.accent.orange,
    },
    featured: {
      backgroundColor: 'rgba(255,255,255,0.92)',
    },
    statusOpen: {
      backgroundColor: theme.isDark ? 'rgba(28, 196, 121, 0.92)' : 'rgba(16, 185, 129, 0.95)',
    },
    statusClosed: {
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
  };
}