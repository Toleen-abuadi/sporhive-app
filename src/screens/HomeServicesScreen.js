import React from 'react';
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
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { spacing, borderRadius } from '../theme/tokens';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

console.log("API_BASE_URL:", process.env.EXPO_PUBLIC_API_BASE_URL);

function ServiceCard({ title, description, icon, color, onPress }) {
  const { colors } = useTheme();
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
      <Card padding="large" style={styles.serviceCard}>
        <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
          <Feather name={icon} size={32} color={color} />
        </View>

        <View style={styles.cardContent}>
          <Text variant="h4" weight="bold" style={styles.cardTitle}>
            {title}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.cardDescription}>
            {description}
          </Text>
        </View>

        <View style={styles.arrowContainer}>
          <Feather name="chevron-right" size={24} color={colors.textMuted} />
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
  const { colors, toggleTheme, isDark } = useTheme();
  const { t, language, changeLanguage } = useI18n();
  const router = useRouter();

  const handleLanguageToggle = () => {
    changeLanguage(language === 'en' ? 'ar' : 'en');
  };

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
      color: '#3B82F6',
      screen: 'Portal',
      href: '/portal/login',
    },
  ];

  return (
    <Screen safe scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <View style={[styles.sparkle, { backgroundColor: colors.accentOrange }]}>
              <Text variant="h3">⚡</Text>
            </View>
            <Text variant="h2" weight="bold">
              {t('home.title')}
            </Text>
          </View>

          <View style={styles.toggles}>
            <ToggleChip
              label={language === 'en' ? 'AR' : 'EN'}
              icon="globe"
              onPress={handleLanguageToggle}
              active={false}
            />
            <ToggleChip
              label={isDark ? t('theme.light') : t('theme.dark')}
              icon={isDark ? 'sun' : 'moon'}
              onPress={toggleTheme}
              active={false}
            />
          </View>
        </View>

        <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
          {t('home.subtitle')}
        </Text>
      </View>

      <View style={styles.servicesContainer}>
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            title={service.title}
            description={service.description}
            icon={service.icon}
            color={service.color}
            onPress={() => {
              if (service.href) router.push(service.href);
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
    marginRight: spacing.md,
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
    marginRight: spacing.lg,
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
