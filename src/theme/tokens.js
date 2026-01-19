import { Platform } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
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
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 34,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 26,
    xl: 30,
    '2xl': 36,
    '3xl': 44,
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
