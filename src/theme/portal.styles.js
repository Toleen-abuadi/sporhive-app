import { Platform, Dimensions } from 'react-native';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

// Design Tokens
export const colors = {
  // Backgrounds
  backgroundDark: '#0A0A0F',
  backgroundCard: '#141420',
  backgroundElevated: '#1C1C2D',
  backgroundOverlay: 'rgba(10, 10, 15, 0.95)',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textTertiary: '#6C6C8A',
  textInverted: '#0A0A0F',
  
  // Accent (Orange Primary)
  primary: '#FF6B35',
  primaryLight: '#FF8B5C',
  primaryDark: '#D45A2C',
  primaryTransparent: 'rgba(255, 107, 53, 0.1)',
  
  // Status
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Borders
  borderLight: 'rgba(255, 255, 255, 0.08)',
  borderMedium: 'rgba(255, 255, 255, 0.12)',
  borderHeavy: 'rgba(255, 255, 255, 0.16)',
  
  // Gradients
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
  // Font families (adjust based on your actual fonts)
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

// Motion Tokens (for Reanimated)
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
    spring: [0.175, 0.885, 0.32, 1.275], // Overshoot spring
  },
};

// Component Recipes
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

// Helper Functions
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

export const formatCurrency = (amount, currency = 'SAR') => {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date, format = 'medium') => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (format === 'relative' && diffDays === 0) {
    return 'Today';
  } else if (format === 'relative' && diffDays === 1) {
    return 'Yesterday';
  } else if (format === 'relative' && diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const screenWidth = WINDOW_WIDTH;
export const screenHeight = WINDOW_HEIGHT;
export const isSmallScreen = WINDOW_WIDTH < 375;
export const isLargeScreen = WINDOW_WIDTH > 768;