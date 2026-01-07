// src/theme/portal.styles.js
import { Platform, Dimensions, StyleSheet } from 'react-native';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

// ----------------------------
// Design Tokens (your original)
// ----------------------------
export const colors = {
  backgroundDark: '#0A0A0F',
  backgroundCard: '#141420',
  backgroundElevated: '#1C1C2D',
  backgroundOverlay: 'rgba(10, 10, 15, 0.95)',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textTertiary: '#6C6C8A',
  textInverted: '#0A0A0F',

  primary: '#FF6B35',
  primaryLight: '#FF8B5C',
  primaryDark: '#D45A2C',
  primaryTransparent: 'rgba(255, 107, 53, 0.1)',

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  borderLight: 'rgba(255, 255, 255, 0.08)',
  borderMedium: 'rgba(255, 255, 255, 0.12)',
  borderHeavy: 'rgba(255, 255, 255, 0.16)',

  gradientPrimary: ['#FF6B35', '#FF8B5C'],
  gradientDark: ['#141420', '#1C1C2D'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenPadding: 16,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const typography = {
  family: {
    regular: Platform.select({ ios: 'System', android: 'Roboto' }),
    medium: Platform.select({ ios: 'System-Medium', android: 'Roboto-Medium' }),
    bold: Platform.select({ ios: 'System-Bold', android: 'Roboto-Bold' }),
  },

  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const motion = {
  durations: {
    fastest: 150,
    fast: 250,
    normal: 350,
    slow: 500,
    slowest: 750,
  },
  easings: {
    linear: [0, 0, 1, 1],
    easeIn: [0.4, 0, 1, 1],
    easeOut: [0, 0, 0.2, 1],
    easeInOut: [0.4, 0, 0.2, 1],
    spring: [0.175, 0.885, 0.32, 1.275],
  },
};

export const card = {
  base: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    ...shadows.md,
  },
  flat: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
  },
};

export const button = {
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.textInverted,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.base,
  },
  secondary: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.base,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    color: colors.primary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.base,
  },
};

export const chip = {
  base: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.round,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  active: {
    backgroundColor: colors.primaryTransparent,
    borderColor: colors.primary,
  },
  small: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
};

// ----------------------------
// Helpers
// ----------------------------
export const hairlineBorder = (color = colors.borderLight) => ({
  borderBottomWidth: 1,
  borderBottomColor: color,
});

export const alphaBg = (color, alpha = 0.1) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const formatCurrency = (amount, currency = 'SAR') =>
  new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

export const formatDate = (date, format = 'medium') => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (format === 'relative' && diffDays === 0) return 'Today';
  if (format === 'relative' && diffDays === 1) return 'Yesterday';
  if (format === 'relative' && diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const screenWidth = WINDOW_WIDTH;
export const screenHeight = WINDOW_HEIGHT;
export const isSmallScreen = WINDOW_WIDTH < 375;
export const isLargeScreen = WINDOW_WIDTH > 768;

// ----------------------------
// Portal bridge exports
// ----------------------------
export const statusColors = {
  neutral: colors.textSecondary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.error,
  info: colors.info,
};

export const portalTokens = {
  colors: {
    bg: colors.backgroundDark,
    surface: colors.backgroundCard,
    surface2: colors.backgroundElevated,
    text: colors.textPrimary,
    textMuted: colors.textSecondary,
    border: colors.borderLight,
    accent: colors.primary,
  },
  spacing,
  radius,
  typography,
  shadows,
  motion,
};

export const helpers = {
  hairlineBorder,
  alphaBg,
  formatCurrency,
  formatDate,
};

// ----------------------------
// Portal concrete styles
// (matches all keys used by the portal screens/components)
// ----------------------------
export const portalStyles = StyleSheet.create({
  // layout
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  h1: {
    color: colors.textPrimary,
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.family.bold,
    letterSpacing: -0.3,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.family.regular,
    marginTop: 4,
  },

  // card
  card: {
    ...card.base,
    padding: spacing.md,
  },

  // hero
  heroCard: {
    ...card.elevated,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    marginRight: spacing.md,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.xl,
  },
  heroName: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.xl,
  },
  heroSub: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  badgePill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.primaryTransparent,
    borderWidth: 1,
    borderColor: alphaBg(colors.primary, 0.35),
  },
  badgePillText: {
    color: colors.primary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },

  // sections/blocks
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.lg,
  },
  blockTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
    marginBottom: spacing.sm,
  },
  blockLine: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    marginTop: 6,
  },
  em: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
  },
  scheduleLine: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 6,
  },

  // links
  linkBtn: {
    marginTop: spacing.md,
    color: colors.primary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.base,
  },

  // KPI grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  kpiCard: {
    ...card.base,
    padding: spacing.md,
    width: (WINDOW_WIDTH - spacing.screenPadding * 2 - spacing.sm) / 2,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiTitle: {
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.4,
  },
  kpiValue: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.xl,
    marginTop: spacing.sm,
  },
  kpiValueSm: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.lg,
  },
  kpiSub: {
    color: colors.textTertiary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
  },

  // pills
  pill: {
    borderRadius: radius.round,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
  },
  pillText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  pillNeutral: {
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.borderMedium,
  },
  pillByTone: {
    success: {
      backgroundColor: alphaBg(colors.success, 0.15),
      borderColor: alphaBg(colors.success, 0.35),
    },
    warning: {
      backgroundColor: alphaBg(colors.warning, 0.15),
      borderColor: alphaBg(colors.warning, 0.35),
    },
    danger: {
      backgroundColor: alphaBg(colors.error, 0.15),
      borderColor: alphaBg(colors.error, 0.35),
    },
    neutral: {
      backgroundColor: colors.backgroundElevated,
      borderColor: colors.borderMedium,
    },
  },

  // actions
  actionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  actionPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.round,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
    overflow: 'hidden',
  },

  // notices
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  noticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  noticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },

  // pressed feedback
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },

  // skeleton
  skeleton: {
    backgroundColor: alphaBg('#FFFFFF', 0.06),
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // error banner
  errorBanner: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: alphaBg(colors.error, 0.35),
    backgroundColor: alphaBg(colors.error, 0.12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
  },
  errorDesc: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    marginTop: 4,
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: alphaBg(colors.primary, 0.15),
    borderWidth: 1,
    borderColor: alphaBg(colors.primary, 0.35),
  },
  retryBtnText: {
    color: colors.primary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },

  // buttons
  primaryBtn: {
    ...button.primary,
    minWidth: 140,
  },
  primaryBtnText: {
    ...button.primaryText,
  },
  ghostBtn: {
    ...button.ghost,
  },
  ghostBtnText: {
    ...button.ghostText,
  },

  // progress
  progressTrack: {
    height: 10,
    borderRadius: 8,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  sessionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  twoColItem: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // compact cards (training)
  compactCardGrid: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  miniCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  miniTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  miniSub: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.xs,
    marginTop: 6,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
  },

  // segmented control + sort
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: radius.round,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.primaryTransparent,
  },
  segmentText: {
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  segmentTextActive: {
    color: colors.primary,
  },
  sortBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sortBtnText: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: 16,
  },

  // badges
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  badgeText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  badgeSuccess: {
    backgroundColor: alphaBg(colors.success, 0.15),
    borderColor: alphaBg(colors.success, 0.35),
  },
  badgeWarn: {
    backgroundColor: alphaBg(colors.warning, 0.15),
    borderColor: alphaBg(colors.warning, 0.35),
  },
  badgeNeutral: {
    backgroundColor: alphaBg('#FFFFFF', 0.06),
    borderColor: colors.borderLight,
  },

  // payments
  payRow: {
    ...card.base,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  payTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  payTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
  },
  payBottom: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payAmount: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.xl,
  },
  printBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: alphaBg(colors.primary, 0.12),
    borderWidth: 1,
    borderColor: alphaBg(colors.primary, 0.35),
  },
  printBtnText: {
    color: colors.primary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  breakdownLine: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    marginTop: 6,
  },

  // timeline
  tlRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  tlRail: {
    width: 22,
    alignItems: 'center',
  },
  tlDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.backgroundDark,
  },
  tlDotActive: { backgroundColor: colors.success },
  tlDotDanger: { backgroundColor: colors.error },
  tlDotNeutral: { backgroundColor: colors.textTertiary },
  tlLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderMedium,
    marginTop: 4,
    borderRadius: 2,
  },
  tlCard: {
    flex: 1,
    ...card.base,
    padding: spacing.md,
  },
  tlTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tlTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
  },
  tlStatus: {
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  tlLog: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },

  // store product
  productCard: {
    ...card.base,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  productTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  productImgWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productImgFallback: {
    flex: 1,
    backgroundColor: alphaBg('#FFFFFF', 0.06),
  },
  productName: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.tight,
  },
  variantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  variantPill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundElevated,
  },
  variantPillActive: {
    borderColor: alphaBg(colors.primary, 0.45),
    backgroundColor: colors.primaryTransparent,
  },
  variantText: {
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  variantTextActive: {
    color: colors.primary,
  },
  productBottom: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.lg,
  },

  // qty stepper
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundElevated,
    overflow: 'hidden',
  },
  qtyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  qtyBtnText: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: 16,
  },
  qtyValue: {
    minWidth: 34,
    textAlign: 'center',
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.sm,
  },

  // input
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
  },

  // orders
  orderRow: {
    ...card.base,
    padding: spacing.md,
    marginTop: spacing.sm,
  },

  // sticky bar
  stickyBar: {
    position: 'absolute',
    left: spacing.screenPadding,
    right: spacing.screenPadding,
    bottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundOverlay,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.lg,
  },
  stickyTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
  },

  // empty state
  emptyTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.lg,
  },

  // health
  fitnessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fitnessCard: {
    ...card.base,
    padding: spacing.md,
    width: (WINDOW_WIDTH - spacing.screenPadding * 2 - spacing.sm) / 2,
  },
  tipsBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: alphaBg(colors.primary, 0.08),
  },
  tipsTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
    marginBottom: spacing.sm,
  },
  tipsText: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    marginTop: 6,
  },
});
