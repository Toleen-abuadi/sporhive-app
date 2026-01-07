// src/components/portal/PortalPrimitives.js
// Portal UI primitives shared across all Player Portal screens.

import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { colors, spacing, radius, typography, shadows, alphaBg } from '../../theme/portal.styles';

// -----------------------------
// Layout wrappers
// -----------------------------

export const PortalScreen = ({ children, style }) => <View style={[styles.screen, style]}>{children}</View>;

export const PortalHeader = memo(function PortalHeader({ title, subtitle, right }) {
  return (
    <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.headerSub}>{subtitle}</Text>}
      </View>
      {right}
    </Animated.View>
  );
});

// -----------------------------
// Cards
// -----------------------------

export const PortalCard = ({ title, subtitle, right, children, style }) => (
  <View style={[styles.card, style]}>
    {title || subtitle || right ? (
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          {!!title && <Text style={styles.cardTitle}>{title}</Text>}
          {!!subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    ) : null}
    {children}
  </View>
);

// Backward-friendly alias used by some screens
export const Card = ({ children, style, title, subtitle, right }) => (
  <PortalCard style={style} title={title} subtitle={subtitle} right={right}>
    {children}
  </PortalCard>
);

// -----------------------------
// Pills / badges
// -----------------------------

export const Pill = memo(function Pill({ label, tone = 'neutral', style }) {
  const bg =
    tone === 'success'
      ? alphaBg(colors.success, 0.14)
      : tone === 'warning'
        ? alphaBg(colors.warning, 0.14)
        : tone === 'danger'
          ? alphaBg(colors.error, 0.14)
          : alphaBg(colors.primary, 0.10);

  const border =
    tone === 'success'
      ? alphaBg(colors.success, 0.32)
      : tone === 'warning'
        ? alphaBg(colors.warning, 0.32)
        : tone === 'danger'
          ? alphaBg(colors.error, 0.32)
          : colors.borderMedium;

  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }, style]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
});

// -----------------------------
// Hero (dashboard)
// -----------------------------

const imgFromBase64 = (b64) => {
  if (!b64) return null;
  if (String(b64).startsWith('data:')) return { uri: b64 };
  return { uri: `data:image/jpeg;base64,${b64}` };
};

export const Hero = memo(function Hero({ name, academyName, badgeText, imageBase64 }) {
  const src = imgFromBase64(imageBase64);
  return (
    <Animated.View entering={FadeInUp.duration(260)} style={styles.hero}>
      <View style={styles.heroLeft}>
        <View style={styles.avatar}>
          {src ? <Image source={src} style={styles.avatarImg} /> : <Text style={styles.avatarFallback}>👤</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName} numberOfLines={1}>
            {name || '—'}
          </Text>
          {!!academyName && (
            <Text style={styles.heroSub} numberOfLines={1}>
              {academyName}
            </Text>
          )}
        </View>
      </View>
      {!!badgeText && <Pill label={badgeText} />}
    </Animated.View>
  );
});

// -----------------------------
// Rows
// -----------------------------

export const PortalRow = memo(({ label, value, onPress, right, tone = 'default' }) => {
  const clickable = !!onPress;
  const Container = clickable ? Pressable : View;

  const bg =
    tone === 'soft'
      ? alphaBg(colors.primary, 0.08)
      : tone === 'danger'
        ? alphaBg(colors.error, 0.10)
        : 'transparent';

  return (
    <Container
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: bg },
        clickable && pressed ? { opacity: 0.85, transform: [{ scale: 0.995 }] } : null,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>
          {value || '—'}
        </Text>
      </View>
      {right}
    </Container>
  );
});

// -----------------------------
// Buttons
// -----------------------------

export const PortalButton = memo(({ label, variant = 'primary', onPress, disabled, left, style }) => {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnSecondary,
        disabled ? { opacity: 0.55 } : null,
        pressed && !disabled ? { transform: [{ scale: 0.99 }], opacity: 0.92 } : null,
        style,
      ]}
    >
      {left}
      <Text style={[styles.btnText, isPrimary ? styles.btnTextPrimary : styles.btnTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
});

// Backward-friendly alias used by some screens
export const PrimaryButton = (props) => <PortalButton {...props} variant="primary" />;

// -----------------------------
// Sticky bottom bar
// -----------------------------

export const StickyBar = ({ children }) => <View style={styles.sticky}>{children}</View>;

// -----------------------------
// Errors / skeleton
// -----------------------------

export const InlineError = ({ text }) =>
  text ? (
    <View style={styles.errBox}>
      <Text style={styles.errText}>{text}</Text>
    </View>
  ) : null;

export const ErrorBanner = ({ title, desc, onRetry }) => (
  <PortalCard style={{ marginTop: 12 }}>
    <Text style={styles.errTitle}>{title || 'Something went wrong'}</Text>
    {!!desc && (
      <Text style={styles.errDesc} numberOfLines={4}>
        {String(desc)}
      </Text>
    )}
    {!!onRetry && (
      <View style={{ marginTop: spacing.md }}>
        <PortalButton label="Retry" onPress={onRetry} variant="secondary" />
      </View>
    )}
  </PortalCard>
);

export const SkeletonBlock = memo(function SkeletonBlock({ h = 12, w = '100%', r = 10, style }) {
  return (
    <View
      style={[
        {
          height: h,
          width: w,
          borderRadius: r,
          backgroundColor: colors.backgroundElevated,
          borderWidth: 1,
          borderColor: colors.borderLight,
        },
        style,
      ]}
    />
  );
});

// -----------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes['3xl'],
    letterSpacing: -0.3,
  },
  headerSub: {
    marginTop: 6,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.45,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.lg,
  },
  cardSub: {
    marginTop: 2,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.35,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  pillText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  hero: {
    marginHorizontal: spacing.screenPadding,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.md,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    paddingRight: spacing.sm,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 22,
  },
  heroName: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.xl,
  },
  heroSub: {
    marginTop: 4,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
  },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    color: colors.textTertiary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
    marginBottom: 3,
  },
  rowValue: {
    color: colors.textPrimary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.base,
  },
  btn: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  btnSecondary: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  btnText: {
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.base,
  },
  btnTextPrimary: { color: colors.textInverted },
  btnTextSecondary: { color: colors.textPrimary },
  sticky: {
    position: 'absolute',
    left: spacing.screenPadding,
    right: spacing.screenPadding,
    bottom: spacing.screenPadding,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundOverlay,
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  errBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: alphaBg(colors.error, 0.14),
    borderWidth: 1,
    borderColor: alphaBg(colors.error, 0.35),
  },
  errText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  errTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.lg,
  },
  errDesc: {
    marginTop: 6,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.4,
  },
});
