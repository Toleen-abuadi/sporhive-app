import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { getPublicUser, getPublicUserMode } from '../services/playgrounds/storage';
import { spacing, borderRadius } from '../theme/tokens';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

console.log("API_BASE_URL:", process.env.EXPO_PUBLIC_API_BASE_URL);

function ServiceCard({ title, description, icon, color, onPress }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={animatedStyle}
    >
      <Card
        padding="large"
        style={[
          styles.serviceCard,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: color + '20' },
            isRTL ? { marginLeft: spacing.lg } : { marginRight: spacing.lg },
          ]}
        >
          <Feather name={icon} size={32} color={color} />
        </View>

        <View style={[styles.cardContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text variant="h4" weight="bold" style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {title}
          </Text>
          <Text
            variant="body"
            color={colors.textSecondary}
            style={[styles.cardDescription, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {description}
          </Text>
        </View>

        <View style={[styles.arrowContainer, { marginLeft: isRTL ? 0 : spacing.md, marginRight: isRTL ? spacing.md : 0 }]}>
          <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={colors.textMuted} />
        </View>
      </Card>
    </AnimatedTouchable>
  );
}

function ToggleChip({ label, icon, onPress, active }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
    >
      <View
        style={[
          styles.chip,
          {
            backgroundColor: active ? colors.accentOrange : colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Feather
          name={icon}
          size={16}
          color={active ? colors.white : colors.textPrimary}
        />
        <Text
          variant="bodySmall"
          weight="medium"
          color={active ? colors.white : colors.textPrimary}
          style={styles.chipText}
        >
          {label}
        </Text>
      </View>
    </AnimatedTouchable>
  );
}

export function HomeServicesScreen() {
  const { colors, themePreference, setThemePreference } = useTheme();
  const { t, language, changeLanguage, isRTL } = useI18n();
  const router = useRouter();

  const handleLanguageToggle = () => {
    changeLanguage(language === 'en' ? 'ar' : 'en');
  };

  const resolvePlaygroundsRoute = useCallback(async () => {
    const [mode, user] = await Promise.all([getPublicUserMode(), getPublicUser()]);
    if (mode === 'registered' && user?.id) {
      return '/playgrounds';
    }
    return '/playgrounds/auth';
  }, []);

  const services = [
    {
      id: 'discover',
      title: t('home.discoverCard.title'),
      description: t('home.discoverCard.description'),
      icon: 'compass',
      color: colors.accentOrange,
      screen: 'Discover',
      href: '/academies',
    },
    {
      id: 'portal',
      title: t('home.portalCard.title'),
      description: t('home.portalCard.description'),
      icon: 'user',
      color: colors.info,
      screen: 'Portal',
      href: '/portal/login',
    },
    {
      id: 'playgrounds-explore',
      title: t('home.playgrounds.explore.title'),
      description: t('home.playgrounds.explore.description'),
      icon: 'map',
      color: colors.success,
      screen: 'PlaygroundsExplore',
      href: '/playgrounds/explore',
    },
  ];

  return (
    <Screen safe scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.logoContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.sparkle,
                { backgroundColor: colors.accentOrange },
                isRTL ? styles.sparkleRtl : styles.sparkleLtr,
              ]}
            >
              <Text variant="h3">⚡</Text>
            </View>
            <Text variant="h2" weight="bold">
              {t('home.title')}
            </Text>
          </View>

          <View style={styles.toggles}>
            <ToggleChip
              label={language === 'en' ? t('language.shortAr') : t('language.shortEn')}
              icon="globe"
              onPress={handleLanguageToggle}
              active={false}
            />
          </View>
        </View>

        <Text
          variant="body"
          color={colors.textSecondary}
          style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {t('home.subtitle')}
        </Text>
      </View>

      <View style={styles.themeSection}>
        <Text variant="caption" weight="semibold" style={{ color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }}>
          {t('theme.label')}
        </Text>
        <SegmentedControl
          value={themePreference}
          onChange={setThemePreference}
          options={[
            {
              value: 'light',
              label: t('theme.light'),
              icon: (active, palette) => (
                <Feather name="sun" size={14} color={active ? palette.accentOrange : palette.textSecondary} />
              ),
            },
            {
              value: 'dark',
              label: t('theme.dark'),
              icon: (active, palette) => (
                <Feather name="moon" size={14} color={active ? palette.accentOrange : palette.textSecondary} />
              ),
            },
            {
              value: 'system',
              label: t('theme.system'),
              icon: (active, palette) => (
                <Feather name="smartphone" size={14} color={active ? palette.accentOrange : palette.textSecondary} />
              ),
            },
          ]}
          style={styles.themeControl}
        />
      </View>

      <View style={styles.servicesContainer}>
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            title={service.title}
            description={service.description}
            icon={service.icon}
            color={service.color}
            onPress={async () => {
              if (!service.href) return;
              if (service.id === 'playgrounds-explore') {
                const target = await resolvePlaygroundsRoute();
                router.replace(target);
                return;
              }
              router.push(service.href);
            }}

          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleLtr: {
    marginRight: spacing.md,
  },
  sparkleRtl: {
    marginLeft: spacing.md,
  },
  toggles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    marginLeft: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  servicesContainer: {
    gap: spacing.lg,
  },
  themeSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  themeControl: {
    alignSelf: 'flex-start',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
  cardDescription: {
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: spacing.md,
  },
});
