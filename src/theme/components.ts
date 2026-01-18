import { palette } from './colors';
import { radius, shadow, spacing, typography } from './tokens';

const light = palette.light;

export const componentStyles = {
  card: {
    borderRadius: radius.lg,
    backgroundColor: light.surface,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: light.border,
    ...shadow.sm,
  },
  cardImageOverlay: {
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: light.overlay,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    borderWidth: 1,
    borderColor: light.border,
    backgroundColor: light.surfaceElevated,
  },
  chipText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: light.textSecondary,
  },
  buttonPrimary: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: light.accent,
  },
  buttonPrimaryText: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: '#FFFFFF',
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: light.border,
    backgroundColor: light.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  sectionHeader: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: light.textPrimary,
    fontWeight: '600' as const,
  },
};

export type ComponentStyles = typeof componentStyles;
