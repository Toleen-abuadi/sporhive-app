import React, { useEffect, useMemo } from 'react';
import { Image, SafeAreaView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Text';
import { useI18n } from '../services/i18n/i18n';
import { spacing, borderRadius, shadow } from '../theme/tokens';
import { storage, APP_STORAGE_KEYS } from '../services/storage/storage';

const logoSource = require('../../assets/images/logo.png');

const FloatingIcon = React.memo(function FloatingIcon({ icon, color, style, delay = 0 }) {
  const float = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    fade.value = withDelay(
      delay,
      withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) })
    );
    float.value = withRepeat(
      withTiming(1, {
        duration: 2400,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [delay, fade, float]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: float.value * -6 }],
  }));

  return (
    <Animated.View style={[styles.iconChip, animatedStyle, style]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </Animated.View>
  );
});

export function WelcomeScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);
  const buttonOffset = useSharedValue(14);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    cardScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    buttonOffset.value = withDelay(250, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    buttonOpacity.value = withDelay(250, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [buttonOffset, buttonOpacity, cardOpacity, cardScale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonOffset.value }],
  }));

  const handleExplore = async () => {
    await storage.setItem(APP_STORAGE_KEYS.WELCOME_SEEN, true);
    router.replace('/services');
  };

  const iconColor = colors.textSecondary;
  const iconData = useMemo(
    () => [
      {
        key: 'soccer',
        icon: 'soccer',
        delay: 150,
        style: { top: -8, left: -8 },
      },
      {
        key: 'volleyball',
        icon: 'volleyball',
        delay: 220,
        style: { top: -14, right: -8 },
      },
      {
        key: 'tennis',
        icon: 'tennis',
        delay: 300,
        style: { top: 120, left: -18 },
      },
      {
        key: 'basketball',
        icon: 'basketball',
        delay: 380,
        style: { top: 130, right: -20 },
      },
      {
        key: 'shuttlecock',
        icon: 'badminton',
        delay: 460,
        style: { bottom: -10, right: 10 },
      },
    ],
    []
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <LinearGradient
          colors={
            isDark
              ? [colors.background, colors.surface]
              : [colors.surface, colors.background]
          }
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.gradient}
        />
        <View style={styles.pattern} pointerEvents="none">
          <View style={[styles.ring, styles.ringLarge, { borderColor: colors.border + '40' }]} />
          <View style={[styles.ring, styles.ringMedium, { borderColor: colors.border + '30' }]} />
          <View style={[styles.ring, styles.ringSmall, { borderColor: colors.border + '25' }]} />
        </View>

        <View style={styles.content}>
          <View style={styles.hero}>
            <Image
              source={logoSource}
              resizeMode="contain"
              style={[styles.watermark, { tintColor: colors.textMuted + '20' }]}
              accessibilityLabel={t('welcome.logoLabel')}
            />
            <Animated.View
              style={[
                styles.logoCard,
                cardStyle,
                {
                  backgroundColor: isDark ? colors.surfaceElevated + 'CC' : colors.white + 'E8',
                  borderColor: colors.border + '80',
                  shadowColor: colors.black,
                },
              ]}
            >
              <Image
                source={logoSource}
                resizeMode="contain"
                style={styles.logo}
                accessibilityLabel={t('welcome.logoLabel')}
              />
            </Animated.View>

            {iconData.map((item) => (
              <FloatingIcon
                key={item.key}
                icon={item.icon}
                color={iconColor}
                delay={item.delay}
                style={[
                  item.style,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.white,
                    borderColor: colors.border,
                    shadowColor: colors.black,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.textBlock}>
            <Text
              variant="h2"
              weight="bold"
              style={[styles.title, { textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
            >
              {t('welcome.title')}
            </Text>
            <Text
              variant="bodyLarge"
              color={colors.textSecondary}
              style={[styles.subtitle, { textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
            >
              {t('welcome.subtitle')}
            </Text>
          </View>
        </View>

        <Animated.View style={[styles.footer, buttonStyle]}>
          <Button
            size="large"
            onPress={handleExplore}
            accessibilityLabel={t('welcome.cta')}
            style={[
              styles.ctaButton,
              {
                backgroundColor: colors.accentOrange,
                borderRadius: borderRadius.pill,
              },
            ]}
            textStyle={styles.ctaText}
          >
            {t('welcome.cta')}
          </Button>
          <Text
            variant="bodySmall"
            color={colors.textMuted}
            style={[styles.hint, { textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
          >
            {t('welcome.hint')}
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  pattern: {
    ...StyleSheet.absoluteFillObject,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  ringLarge: {
    width: 420,
    height: 420,
    top: -80,
    right: -140,
  },
  ringMedium: {
    width: 300,
    height: 300,
    top: 60,
    left: -160,
  },
  ringSmall: {
    width: 200,
    height: 200,
    bottom: 80,
    right: -100,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
  watermark: {
    position: 'absolute',
    width: 220,
    height: 220,
    opacity: 0.08,
  },
  logoCard: {
    width: 230,
    height: 230,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...shadow.lg,
  },
  logo: {
    width: 150,
    height: 150,
  },
  iconChip: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...shadow.sm,
  },
  textBlock: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    maxWidth: 320,
    lineHeight: 26,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
  ctaButton: {
    width: '100%',
    minHeight: 56,
  },
  ctaText: {
    fontSize: 18,
  },
  hint: {
    marginTop: spacing.md,
  },
});
