import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { CalendarDays, CreditCard, MapPin, Users } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { useTranslation } from '../../services/i18n/i18n';
import { AppScreen } from '../../components/ui/AppScreen';
import { Text } from '../../components/ui/Text';
import { Chip } from '../../components/ui/Chip';
import { useToast } from '../../components/ui/ToastHost';
import {
  ENTRY_MODE_VALUES,
  setEntryMode,
  setWelcomeSeen,
} from '../../services/storage/storage';
import { borderRadius, shadow, spacing } from '../../theme/tokens';

const logoSource = require('../../../assets/images/logo.png');

function trackEntryEvent(name, payload) {
  const analytics = globalThis?.sporhiveAnalytics;
  if (analytics && typeof analytics.track === 'function') {
    analytics.track(name, payload);
  }

  if (__DEV__) {
    console.log('[entry]', name, payload || {});
  }
}

function DecisionCard({
  title,
  description,
  chipLabel,
  IconPrimary,
  IconSecondary,
  colors,
  isRTL,
  onPress,
  accessibilityLabel,
  disabled,
  mountProgress,
}) {
  const scale = useSharedValue(1);
  const sweep = useSharedValue(0);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: mountProgress.value,
    transform: [
      { translateY: interpolate(mountProgress.value, [0, 1], [20, 0]) },
      { scale: scale.value },
    ],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweep.value * 0.25,
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-260, 260]) }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withTiming(0.98, { duration: 110 });
    sweep.value = 0;
    sweep.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 130 });
  };

  return (
    <Animated.View style={animatedCardStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: disabled ? 0.7 : pressed ? 0.95 : 1,
          },
        ]}
        android_ripple={{ color: colors.accentOrangeSoft }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cardSweep,
            { backgroundColor: colors.accentOrange },
            sweepStyle,
          ]}
        />

        <View
          style={[
            styles.cardTop,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View
            style={[
              styles.iconBubble,
              {
                backgroundColor: colors.accentOrangeSoft,
                borderColor: colors.border,
              },
            ]}
          >
            <IconPrimary size={20} color={colors.accentOrange} strokeWidth={2.3} />
          </View>
          <View
            style={[
              styles.iconBubbleSecondary,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                marginLeft: isRTL ? 0 : -10,
                marginRight: isRTL ? -10 : 0,
              },
            ]}
          >
            <IconSecondary size={18} color={colors.textSecondary} strokeWidth={2.2} />
          </View>
          <Chip
            selected
            label={chipLabel}
            style={[
              styles.cardChip,
              { marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0 },
            ]}
          />
        </View>

        <View style={styles.cardBody}>
          <Text variant="h3" weight="bold">
            {title}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.cardDescription}>
            {description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function EntryDecisionScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [submittingMode, setSubmittingMode] = useState(null);

  const titleProgress = useSharedValue(0);
  const cardOneProgress = useSharedValue(0);
  const cardTwoProgress = useSharedValue(0);
  const footerProgress = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    titleProgress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    cardOneProgress.value = withDelay(
      80,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    cardTwoProgress.value = withDelay(
      160,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    footerProgress.value = withDelay(
      220,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) })
    );

    glowPulse.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    trackEntryEvent('entry_viewed', {
      locale: isRTL ? 'ar' : 'en',
    });
  }, [cardOneProgress, cardTwoProgress, footerProgress, glowPulse, isRTL, titleProgress]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [{ translateY: interpolate(titleProgress.value, [0, 1], [20, 0]) }],
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerProgress.value,
    transform: [{ translateY: interpolate(footerProgress.value, [0, 1], [14, 0]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.22 + glowPulse.value * 0.2,
    transform: [
      { translateY: interpolate(glowPulse.value, [0, 1], [0, -12]) },
      { scale: 1 + glowPulse.value * 0.06 },
    ],
  }));

  const chooseMode = useCallback(
    async (mode, source = 'card') => {
      if (submittingMode) return;
      setSubmittingMode(mode);

      trackEntryEvent('entry_selected', { mode, source });

      try {
        await Promise.all([
          setEntryMode(mode),
          setWelcomeSeen(true),
        ]);
        router.replace(`/(auth)/login?mode=${mode}&lockMode=1`);
      } catch (error) {
        if (__DEV__) {
          console.warn('[entry] failed to persist mode selection', {
            mode,
            source,
            error: String(error?.message || error),
          });
        }
        toast.error(t('errors.couldNotSaveChoice'));
      } finally {
        setSubmittingMode(null);
      }
    },
    [router, submittingMode, t, toast]
  );

  const backgroundColors = useMemo(
    () =>
      isDark
        ? [colors.background, colors.surfaceElevated, colors.background]
        : [colors.surface, colors.background, colors.surface],
    [colors.background, colors.surface, colors.surfaceElevated, isDark]
  );

  return (
    <AppScreen
      scroll
      safe
      paddingHorizontal={0}
      paddingTop={50}
      paddingBottom={0}
      contentContainerStyle={styles.screenContainer}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={backgroundColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.bgLayer} pointerEvents="none">
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: colors.accentOrange + '3A',
                right: isRTL ? undefined : -80,
                left: isRTL ? -80 : undefined,
              },
              glowStyle,
            ]}
          />
          <View
            style={[
              styles.ring,
              styles.ringLarge,
              {
                borderColor: colors.border + '5A',
                right: isRTL ? undefined : -140,
                left: isRTL ? -140 : undefined,
              },
            ]}
          />
          <View
            style={[
              styles.ring,
              styles.ringSmall,
              {
                borderColor: colors.border + '42',
                left: isRTL ? undefined : -80,
                right: isRTL ? -80 : undefined,
              },
            ]}
          />
        </View>

        <Animated.View style={[styles.hero, titleStyle]}>
          <View style={[styles.logoWrap, { backgroundColor: colors.accentOrange + '1F' }]}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>
          <Text variant="h2" weight="bold" style={styles.brandText}>
            SporHive
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.tagline}>
            {t('entry.tagline')}
          </Text>

          <Text variant="display" weight="bold" style={styles.title}>
            {t('entry.title')}
          </Text>
        </Animated.View>

        <View style={styles.cards}>
          <DecisionCard
            title={t('entry.public.title')}
            description={t('entry.public.desc')}
            chipLabel={t('entry.public.chip')}
            IconPrimary={MapPin}
            IconSecondary={CalendarDays}
            colors={colors}
            isRTL={isRTL}
            mountProgress={cardOneProgress}
            disabled={Boolean(submittingMode)}
            onPress={() => chooseMode(ENTRY_MODE_VALUES.PUBLIC)}
            accessibilityLabel={t('entry.public.title')}
          />

          <DecisionCard
            title={t('entry.player.title')}
            description={t('entry.player.desc')}
            chipLabel={t('entry.player.chip')}
            IconPrimary={Users}
            IconSecondary={CreditCard}
            colors={colors}
            isRTL={isRTL}
            mountProgress={cardTwoProgress}
            disabled={Boolean(submittingMode)}
            onPress={() => chooseMode(ENTRY_MODE_VALUES.PLAYER)}
            accessibilityLabel={t('entry.player.title')}
          />
        </View>

        <Animated.View style={[styles.footer, footerStyle]}>
          {submittingMode ? (
            <View style={[styles.savingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ActivityIndicator size="small" color={colors.accentOrange} />
              <Text variant="caption" color={colors.textSecondary}>
                {t('common.loading')}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => chooseMode(ENTRY_MODE_VALUES.PUBLIC, 'not_sure')}
            disabled={Boolean(submittingMode)}
            style={({ pressed }) => [
              styles.notSure,
              {
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
                opacity: submittingMode ? 0.7 : 1,
              },
            ]}
            android_ripple={{ color: colors.accentOrangeSoft }}
          >
            <MapPin size={16} color={colors.accentOrange} strokeWidth={2.4} />
            <Text variant="bodySmall" weight="semibold" color={colors.textPrimary}>
              {t('entry.notSure')}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    minHeight: 720,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['2xl'],
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glow: {
    position: 'absolute',
    top: -40,
    width: 260,
    height: 260,
    borderRadius: 999,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  ringLarge: {
    top: 40,
    width: 360,
    height: 360,
  },
  ringSmall: {
    bottom: 140,
    width: 220,
    height: 220,
  },
  hero: {
    alignItems: 'center',
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logo: {
    width: 52,
    height: 52,
  },
  brandText: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  title: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 540,
    lineHeight: 26,
  },
  cards: {
    marginTop: spacing['2xl'],
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    minHeight: 158,
    overflow: 'hidden',
    ...shadow.md,
  },
  cardSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 70,
  },
  cardTop: {
    alignItems: 'center',
    minHeight: 34,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconBubbleSecondary: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 12,
  },
  cardChip: {
    alignSelf: 'center',
  },
  cardBody: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  cardDescription: {
    lineHeight: 22,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  savingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footerHint: {
    textAlign: 'center',
    maxWidth: 460,
  },
  notSure: {
    minHeight: 46,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  poweredBy: {
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: Platform.OS === 'android' ? spacing.sm : 0,
  },
});
