// src/components/portal/PortalPrimitives.js
import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { colors, spacing, radius, typography, shadows, alphaBg } from '../../theme/portal.styles';

// ----------
// Layout
// ----------
export const PortalScreen = ({ children, style }) => (
  <View style={[styles.screen, style]}>{children}</View>
);

// ----------
// Header / Hero
// ----------
export const PortalHeader = memo(function PortalHeader({ title, subtitle, right, onBack }) {
  return (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {!!onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {!!title && <Text style={styles.headerTitle}>{title}</Text>}
          {!!subtitle && <Text style={styles.headerSub}>{subtitle}</Text>}
        </View>
      </View>
      {!!right && <View style={{ marginLeft: spacing.sm }}>{right}</View>}
    </View>
  );
});

export const Hero = memo(function Hero({ title, subtitle, badge, imageSource, right }) {
  return (
    <View style={styles.hero}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {!!badge && <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{badge}</Text></View>}
          {!!right && <View style={{ marginLeft: 'auto' }}>{right}</View>}
        </View>
        {!!title && <Text style={styles.heroTitle} numberOfLines={1}>{title}</Text>}
        {!!subtitle && <Text style={styles.heroSub} numberOfLines={2}>{subtitle}</Text>}
      </View>

      {!!imageSource && (
        <View style={styles.heroAvatarWrap}>
          <Image source={imageSource} style={styles.heroAvatar} />
        </View>
      )}
    </View>
  );
});

// ----------
// Card
// ----------
export const PortalCard = ({ title, subtitle, right, children, style }) => (
  <View style={[styles.card, style]}>
    {(title || subtitle || right) ? (
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          {!!title && <Text style={styles.cardTitle}>{title}</Text>}
          {!!subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
        </View>
        {!!right && <View style={{ marginLeft: spacing.sm }}>{right}</View>}
      </View>
    ) : null}
    <View style={styles.cardBody}>{children}</View>
  </View>
);

// Aliases used by some portal screens (keep backward compatibility)
export const Card = PortalCard;

// ----------
// Rows / Pills
// ----------
export const PortalRow = memo(function PortalRow({ leftIcon, title, value, right, tone = 'neutral', style, onPress }) {
  const Comp = onPress ? Pressable : View;
  const toneStyles = rowTone(tone);
  return (
    <Comp onPress={onPress} style={[styles.row, toneStyles.row, style]}>
      {!!leftIcon && <View style={[styles.rowIconWrap, toneStyles.iconWrap]}>{leftIcon}</View>}
      <View style={{ flex: 1 }}>
        {!!title && <Text style={styles.rowTitle}>{title}</Text>}
        {!!value && <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>}
      </View>
      {!!right && <View style={{ marginLeft: spacing.sm }}>{right}</View>}
      {!!onPress && <Feather name="chevron-right" size={18} color={colors.textTertiary} />}
    </Comp>
  );
});

export const Pill = memo(function Pill({ label, tone = 'neutral', small }) {
  const toneStyles = pillTone(tone);
  return (
    <View style={[styles.pill, small && styles.pillSmall, toneStyles.wrap]}>
      <Text style={[styles.pillText, toneStyles.text]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

// Keep existing Chip pattern (some older screens use it)
export const PortalChip = ({ label, active, small, left }) => (
  <View style={[styles.chip, active && styles.chipActive, small && styles.chipSmall]}>
    {!!left && <View style={{ marginRight: 6 }}>{left}</View>}
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

// ----------
// Buttons
// ----------
export const PortalButton = ({ title, left, right, tone = 'primary', disabled, loading, onPress, style }) => {
  const isPrimary = tone === 'primary';
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnSecondary,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && !loading && styles.btnPressed,
        style,
      ]}
    >
      {!!left && <View style={{ marginRight: spacing.sm }}>{left}</View>}
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.textInverted : colors.textPrimary} />
      ) : (
        <Text style={[styles.btnText, isPrimary ? styles.btnTextPrimary : styles.btnTextSecondary]} numberOfLines={1}>
          {title}
        </Text>
      )}
      {!!right && <View style={{ marginLeft: spacing.sm }}>{right}</View>}
    </Pressable>
  );
};

export const PrimaryButton = (props) => <PortalButton {...props} tone="primary" />;

// ----------
// Sticky bar (CTA)
export const StickyBar = ({ children }) => <View style={styles.sticky}>{children}</View>;

// ----------
// Errors + Loading
// ----------
export const InlineError = ({ text, style }) => (text ? <Text style={[styles.inlineError, style]}>{text}</Text> : null);

export const ErrorBanner = memo(function ErrorBanner({ title = 'Something went wrong', message, onRetry }) {
  return (
    <View style={styles.errorBanner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.errorTitle}>{title}</Text>
        {!!message && <Text style={styles.errorMsg}>{message}</Text>}
      </View>
      {!!onRetry && (
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
});

export const SkeletonBlock = memo(function SkeletonBlock({ height = 14, width = '100%', style }) {
  return <View style={[styles.skel, { height, width }, style]} />;
});

// ----------
// Helpers
// ----------
const pillTone = (tone) => {
  if (tone === 'success') return { wrap: { backgroundColor: alphaBg(colors.success, 0.18), borderColor: alphaBg(colors.success, 0.35) }, text: { color: colors.success } };
  if (tone === 'warning') return { wrap: { backgroundColor: alphaBg(colors.warning, 0.18), borderColor: alphaBg(colors.warning, 0.35) }, text: { color: colors.warning } };
  if (tone === 'danger') return { wrap: { backgroundColor: alphaBg(colors.error, 0.18), borderColor: alphaBg(colors.error, 0.35) }, text: { color: colors.error } };
  if (tone === 'info') return { wrap: { backgroundColor: alphaBg(colors.info, 0.18), borderColor: alphaBg(colors.info, 0.35) }, text: { color: colors.info } };
  return { wrap: { backgroundColor: colors.backgroundElevated, borderColor: colors.borderMedium }, text: { color: colors.textSecondary } };
};

const rowTone = (tone) => {
  if (tone === 'success') return { row: { backgroundColor: alphaBg(colors.success, 0.10) }, iconWrap: { backgroundColor: alphaBg(colors.success, 0.16) } };
  if (tone === 'warning') return { row: { backgroundColor: alphaBg(colors.warning, 0.10) }, iconWrap: { backgroundColor: alphaBg(colors.warning, 0.16) } };
  if (tone === 'danger') return { row: { backgroundColor: alphaBg(colors.error, 0.10) }, iconWrap: { backgroundColor: alphaBg(colors.error, 0.16) } };
  if (tone === 'info') return { row: { backgroundColor: alphaBg(colors.info, 0.10) }, iconWrap: { backgroundColor: alphaBg(colors.info, 0.16) } };
  return { row: { backgroundColor: colors.backgroundElevated }, iconWrap: { backgroundColor: colors.backgroundCard } };
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundDark },

  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.xl,
  },
  headerSub: {
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
  },

  hero: {
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    ...shadows.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.round,
    backgroundColor: alphaBg(colors.primary, 0.14),
    borderWidth: 1,
    borderColor: alphaBg(colors.primary, 0.35),
  },
  heroBadgeText: {
    color: colors.primaryLight,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  heroTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes['2xl'],
  },
  heroSub: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    lineHeight: Math.round(typography.sizes.sm * typography.lineHeights.relaxed),
  },
  heroAvatarWrap: {
    width: 62,
    height: 62,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.backgroundCard,
  },
  heroAvatar: { width: '100%', height: '100%' },

  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.lg,
  },
  cardSub: {
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
  },
  cardBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },

  row: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rowTitle: {
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  rowValue: {
    marginTop: 2,
    color: colors.textPrimary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.base,
    lineHeight: Math.round(typography.sizes.base * typography.lineHeights.normal),
  },

  pill: {
    borderWidth: 1,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  pillSmall: { paddingVertical: 4, paddingHorizontal: spacing.sm },
  pillText: {
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },

  chip: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.round,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  chipActive: { backgroundColor: alphaBg(colors.primary, 0.12), borderColor: alphaBg(colors.primary, 0.5) },
  chipSmall: { paddingVertical: 2, paddingHorizontal: spacing.sm },
  chipText: { color: colors.textPrimary, fontFamily: typography.family.medium, fontSize: typography.sizes.sm },

  btn: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  btnPrimary: { backgroundColor: colors.primary, ...shadows.glow },
  btnSecondary: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  btnDisabled: { opacity: 0.55 },
  btnPressed: { transform: [{ scale: 0.98 }] },
  btnText: { fontFamily: typography.family.medium, fontSize: typography.sizes.base },
  btnTextPrimary: { color: colors.textInverted },
  btnTextSecondary: { color: colors.textPrimary },

  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.screenPadding,
    backgroundColor: colors.backgroundOverlay,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  inlineError: { marginTop: 6, color: colors.error, fontFamily: typography.family.regular, fontSize: typography.sizes.sm },

  errorBanner: {
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: alphaBg(colors.error, 0.35),
    backgroundColor: alphaBg(colors.error, 0.12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  errorTitle: { color: colors.textPrimary, fontFamily: typography.family.bold, fontSize: typography.sizes.base },
  errorMsg: { marginTop: 2, color: colors.textSecondary, fontFamily: typography.family.regular, fontSize: typography.sizes.sm },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.backgroundElevated,
  },
  retryText: { color: colors.textPrimary, fontFamily: typography.family.medium, fontSize: typography.sizes.sm },

  skel: {
    borderRadius: radius.sm,
    backgroundColor: alphaBg('#FFFFFF', 0.06),
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
