import { Platform } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
  full: 999,
};

export const typography = {
  family: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  size: {
    xs: 12,
    sm: 13,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  lineHeight: {
    xs: 16,
    sm: 18,
    md: 24,
    lg: 26,
    xl: 28,
    '2xl': 32,
    '3xl': 40,
  },
  variants: {
    display: { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.2 },
    h1: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
    h2: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
    h3: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
    body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
    bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
    overline: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
  },
};

export const borderRadius = radius;

export const fontSize = {
  xs: typography.size.xs,
  sm: typography.size.sm,
  base: typography.size.md,
  lg: typography.size.lg,
  xl: typography.size.xl,
  xxl: typography.size['2xl'],
  xxxl: typography.size['3xl'],
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
};

export const motion = {
  duration: {
    fast: 140,
    base: 220,
    slow: 320,
  },
  easing: {
    standard: 'easeOut',
  },
};

const makeShadow = (elevation, opacity, radiusValue, offsetY) =>
  Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: opacity,
      shadowRadius: radiusValue,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation },
    default: {},
  }) || {};

export const shadow = {
  sm: makeShadow(2, 0.12, 4, 2),
  md: makeShadow(4, 0.16, 8, 4),
  lg: makeShadow(8, 0.2, 12, 6),
};

export const shadows = shadow;
