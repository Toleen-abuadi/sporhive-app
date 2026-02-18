import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen } from '../components/ui/AppScreen';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Skeleton } from '../components/ui/Skeleton';
import { SmartImage } from '../components/ui/SmartImage';
import { Text } from '../components/ui/Text';

import { QuickSettingsSheet } from '../components/services/QuickSettingsSheet';

import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { useAuth } from '../services/auth/auth.store';
import { playgroundsApi } from '../services/playgrounds/playgrounds.api';
import { API_BASE_URL } from '../services/api/client';
import { normalizeApiError } from '../services/api/normalizeApiError';
import { borderRadius, shadow, spacing } from '../theme/tokens';

const logoSource = require('../../assets/images/logo.png');

const FALLBACK_FEATURE_IMAGE =
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=80';
const FALLBACK_TRENDING_IMAGE =
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80';

const PLACEHOLDER_SLOTS_LEFT = 6;
const PLACEHOLDER_PLAYERS_BOOKED = 120;
const PLACEHOLDER_WEEKLY_BOOKINGS = 2134;
const DISTANCE_FALLBACKS = [1.2, 2.4, 0.8, 3.1, 1.6, 2.2, 4.0];

const normalizeImageUrl = (uri) => {
  if (!uri || typeof uri !== 'string') return null;
  if (uri.startsWith('http')) return uri;
  const normalized = uri.startsWith('/') ? uri : `/${uri}`;
  return `${API_BASE_URL}${normalized}`;
};

const resolveVenueImage = (venue) => {
  const images = Array.isArray(venue?.images)
    ? venue.images
    : Array.isArray(venue?.venue_images)
      ? venue.venue_images
      : [];

  const urlFromArray = images
    .map((img) => img?.url || img?.path || img?.image || img?.filename || '')
    .find(Boolean);

  if (urlFromArray) return normalizeImageUrl(urlFromArray);
  if (venue?.image) return normalizeImageUrl(venue.image);
  if (venue?.academy_profile?.hero_image) return normalizeImageUrl(venue.academy_profile.hero_image);
  return null;
};

const resolveVenueLogo = (venue) => {
  const candidate =
    venue?.logo ||
    venue?.academy_logo ||
    venue?.academy_profile?.logo ||
    venue?.academy_profile?.image ||
    null;
  return normalizeImageUrl(candidate) || candidate || null;
};

const toNumeric = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const resolveDistanceKm = (venue, index) => {
  const candidate =
    toNumeric(venue?.distance_km) ??
    toNumeric(venue?.distance) ??
    toNumeric(venue?.distanceKm) ??
    DISTANCE_FALLBACKS[index % DISTANCE_FALLBACKS.length];
  return Math.max(0.1, candidate);
};

const resolveRating = (venue) => {
  const candidate = toNumeric(venue?.rating) ?? toNumeric(venue?.avg_rating) ?? 4.8;
  return Math.max(0, Math.min(5, candidate));
};

const getInitials = (user) => {
  const first = user?.first_name || user?.firstName || '';
  const last = user?.last_name || user?.lastName || '';
  const initials = `${first?.[0] || ''}${last?.[0] || ''}`.trim();
  return initials || user?.username?.[0] || user?.phone?.[0] || 'S';
};

const getDisplayName = (user, fallbackName) => {
  const fullName = user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  return fullName || user?.username || fallbackName;
};

const isPlayerSession = (session) => {
  const user = session?.user || session?.profile || session || null;
  const loginAs =
    session?.login_as ||
    session?.loginAs ||
    session?.userType ||
    user?.type ||
    user?.role ||
    '';
  return String(loginAs).toLowerCase() === 'player';
};

const getTimeOfDayKey = (hour) => {
  if (hour < 12) return 'home.timeOfDay.morning';
  if (hour < 18) return 'home.timeOfDay.afternoon';
  return 'home.timeOfDay.evening';
};

const entranceStyle = (animatedValue) => ({
  opacity: animatedValue,
  transform: [
    {
      translateY: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [12, 0],
      }),
    },
  ],
});

function HeroHeader({
  colors,
  heroHeight,
  insetsTop,
  isRTL,
  greetingText,
  locationText,
  t,
  avatarImage,
  avatarInitials,
  onExplorePress,
  onSettingsPress,
  greetingAnimatedStyle,
  ctaAnimatedStyle,
}) {
  return (
    <View style={[styles.hero, { height: heroHeight }]}>
      <LinearGradient
        colors={['#091223', '#111827', '#1D2942']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.heroGlowPrimary, { backgroundColor: `${colors.accentOrange}2B` }]} />
      <View style={[styles.heroGlowSecondary, { backgroundColor: `${colors.info}1E` }]} />
      <View style={[styles.heroGlowTertiary, { backgroundColor: `${colors.white}12` }]} />

      <View
        style={[
          styles.heroTopRow,
          {
            paddingTop: insetsTop + spacing.sm,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={[styles.brandPill, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
          <SmartImage source={logoSource} style={styles.brandLogo} borderRadius={12} showLoader={false} />
          <Text variant="bodySmall" weight="semibold" color={colors.white}>
            {t('home.title')}
          </Text>
        </View>

        <Pressable
          onPress={onSettingsPress}
          accessibilityLabel={t('services.settings.open')}
          style={({ pressed }) => [
            styles.avatarWrap,
            {
              opacity: pressed ? 0.86 : 1,
              borderColor: `${colors.white}40`,
              backgroundColor: 'rgba(255,255,255,0.12)',
            },
          ]}
        >
          {avatarImage ? (
            <SmartImage
              source={normalizeImageUrl(avatarImage) || avatarImage}
              fallbackSource={logoSource}
              style={styles.avatarImage}
              borderRadius={20}
              showLoader={false}
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: `${colors.white}18` }]}>
              <Text variant="bodySmall" weight="bold" color={colors.white}>
                {avatarInitials}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <Animated.View style={[styles.greetingBlock, greetingAnimatedStyle]}>
        <Text variant="h1" weight="bold" color={colors.white} style={styles.greetingText}>
          {greetingText}
        </Text>
        <View
          style={[
            styles.locationPill,
            {
              backgroundColor: 'rgba(255,255,255,0.15)',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignSelf: isRTL ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          <Icon name="map-pin" size={14} color={colors.white} />
          <Text variant="bodySmall" weight="medium" color={colors.white}>
            {locationText}
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.heroCtaWrap,
          ctaAnimatedStyle,
          { alignItems: isRTL ? 'flex-end' : 'flex-start' },
        ]}
      >
        <Button onPress={onExplorePress} style={styles.heroCtaButton} textStyle={styles.heroCtaText}>
          {t('home.exploreAcademies')}
        </Button>
      </Animated.View>
    </View>
  );
}

function FeatureBookingCard({ colors, imageSource, isRTL, onPress, slotsText, t }) {
  return (
    <Card
      onPress={onPress}
      padding="none"
      style={[
        styles.featureCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.featureCardInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.featureCardContent}>
          <View style={[styles.slotsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.slotsIcon, { backgroundColor: `${colors.warning}20` }]}>
              <Icon name="zap" size={14} color={colors.warning} />
            </View>
            <Text variant="bodySmall" weight="semibold" color={colors.textSecondary}>
              {slotsText}
            </Text>
          </View>

          <Text variant="h3" weight="bold" style={styles.featureTitle}>
            {t('home.bookPlaygroundNow')}
          </Text>

          <Button size="small" onPress={onPress} style={[styles.featureButton, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
            {t('home.viewCourts')}
          </Button>
        </View>

        <SmartImage
          source={imageSource}
          fallbackSource={logoSource}
          style={styles.featureImageWrap}
          borderRadius={borderRadius.md}
          accessibilityLabel={t('home.bookPlaygroundNow')}
        />
      </View>
    </Card>
  );
}

function QuickAccessGrid({ colors, isRTL, items, subtitle, t }) {
  return (
    <View style={styles.sectionWrap}>
      <Text variant="h3" weight="bold">
        {t('home.quickAccessTitle')}
      </Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={styles.sectionSubtitle}>
        {subtitle}
      </Text>

      <View style={[styles.quickGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {items.map((item) => (
          <Card
            key={item.id}
            onPress={item.onPress}
            padding="medium"
            style={[
              styles.quickCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.quickIconWrap,
                {
                  alignSelf: isRTL ? 'flex-end' : 'flex-start',
                  backgroundColor: `${item.color}1F`,
                },
              ]}
            >
              <Icon name={item.icon} size={18} color={item.color} />
            </View>

            <Text variant="body" weight="semibold" numberOfLines={1}>
              {item.title}
            </Text>
            <Text
              variant="bodySmall"
              color={colors.textSecondary}
              numberOfLines={2}
              style={styles.quickCardDescription}
            >
              {item.description}
            </Text>

            {item.badgeText ? (
              <View
                style={[
                  styles.soonChip,
                  {
                    alignSelf: isRTL ? 'flex-end' : 'flex-start',
                    backgroundColor: `${colors.warning}22`,
                  },
                ]}
              >
                <Text variant="caption" weight="semibold" color={colors.warning}>
                  {item.badgeText}
                </Text>
              </View>
            ) : null}
          </Card>
        ))}
      </View>
    </View>
  );
}

function TrendingVenueTile({ colors, index, isRTL, item, onPress, t }) {
  const imageUrl = resolveVenueImage(item) || FALLBACK_TRENDING_IMAGE;
  const logoUrl = resolveVenueLogo(item) || logoSource;
  const title = item?.name || item?.title || t('services.trending.fallback');
  const rating = resolveRating(item).toFixed(1);
  const distance = resolveDistanceKm(item, index).toFixed(1);

  return (
    <Card
      onPress={onPress}
      padding="none"
      style={[
        styles.trendingCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.trendingImageWrap}>
        <SmartImage
          source={imageUrl}
          fallbackSource={logoSource}
          style={StyleSheet.absoluteFillObject}
          borderRadius={borderRadius.lg}
          accessibilityLabel={title}
        />

        <View
          style={[
            styles.ratingPill,
            {
              backgroundColor: 'rgba(11,15,20,0.66)',
              left: isRTL ? undefined : spacing.sm,
              right: isRTL ? spacing.sm : undefined,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Icon name="star" size={12} color={colors.warning} />
          <Text variant="caption" weight="semibold" color={colors.white}>
            {rating}
          </Text>
        </View>

        <View style={[styles.trendingLogoBadge, { backgroundColor: `${colors.white}EB` }]}>
          <SmartImage source={logoUrl} fallbackSource={logoSource} style={styles.trendingLogo} borderRadius={14} />
        </View>

        <View
          style={[
            styles.distancePill,
            {
              backgroundColor: 'rgba(11,15,20,0.7)',
              left: isRTL ? undefined : spacing.sm,
              right: isRTL ? spacing.sm : undefined,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Icon name="map-pin" size={12} color={colors.white} />
          <Text variant="caption" weight="medium" color={colors.white}>
            {t('home.distanceAway', { distance })}
          </Text>
        </View>
      </View>

      <View style={styles.trendingTitleWrap}>
        <Text variant="bodySmall" weight="semibold" numberOfLines={1}>
          {title}
        </Text>
      </View>
    </Card>
  );
}

function TrendingCarousel({ city, colors, isDark, isRTL, loading, error, onRetry, data, onOpenVenue, subtitle, t }) {
  const renderItem = useCallback(
    ({ item, index }) => (
      <TrendingVenueTile
        item={item}
        index={index}
        colors={colors}
        isRTL={isRTL}
        t={t}
        onPress={() => onOpenVenue(item)}
      />
    ),
    [colors, isRTL, onOpenVenue, t]
  );

  return (
    <View style={styles.sectionWrap}>
      <View
        style={[
          styles.segmentedPill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={[styles.segmentedActive, { backgroundColor: `${colors.accentOrange}1F` }]}>
          <Text variant="bodySmall" weight="semibold" color={colors.accentOrange}>
            {t('home.trendingNearYou')}
          </Text>
        </View>
        <View style={styles.segmentedInactive}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t('home.mostBookedToday')}
          </Text>
        </View>
      </View>

      <Text variant="bodySmall" color={colors.textSecondary} style={styles.sectionSubtitle}>
        {subtitle || t('home.trendingSubtitle', { count: '0', city })}
      </Text>

      {loading ? (
        <View style={styles.trendingSkeletonRow}>
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={`trending-skeleton-${index}`} style={styles.trendingSkeletonCard}>
              <Skeleton
                height={156}
                radius={borderRadius.lg}
                mode={isDark ? 'dark' : 'light'}
                style={styles.trendingSkeletonImage}
              />
              <Skeleton height={12} radius={borderRadius.md} mode={isDark ? 'dark' : 'light'} />
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="body" weight="semibold">
            {t('services.trending.errorTitle')}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {error}
          </Text>
          <Button size="small" onPress={onRetry} style={styles.retryButton}>
            {t('services.trending.retry')}
          </Button>
        </View>
      ) : data.length ? (
        <FlatList
          data={data}
          horizontal
          inverted={isRTL}
          keyExtractor={(item, index) => String(item?.id ?? item?.slug ?? index)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingList}
          renderItem={renderItem}
        />
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="body" weight="semibold">
            {t('services.trending.emptyTitle')}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t('services.trending.emptyMessage')}
          </Text>
        </View>
      )}
    </View>
  );
}

function ActivitySnapshotCard({ academy, colors, isRTL, onOpenPortal, sessionLabel, timeLabel, t }) {
  return (
    <View style={styles.sectionWrap}>
      <Text variant="h3" weight="bold">
        {t('home.activitySnapshot')}
      </Text>

      <Card
        padding="medium"
        style={[
          styles.snapshotCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.snapshotAccent,
            {
              backgroundColor: colors.accentOrange,
              left: isRTL ? undefined : spacing.md,
              right: isRTL ? spacing.md : undefined,
            },
          ]}
        />

        <View style={[styles.snapshotRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.snapshotTextWrap}>
            <Text variant="body" weight="semibold" numberOfLines={2}>
              {t('home.nextTrainingSession', { session: sessionLabel })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('home.sessionMeta', { time: timeLabel, academy })}
            </Text>
          </View>

          <Button variant="ghost" size="small" onPress={onOpenPortal} style={styles.portalCtaButton}>
            {t('home.openPortal')}
          </Button>
        </View>
      </Card>
    </View>
  );
}

export function HomeServicesScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL, language } = useI18n();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, session } = useAuth();

  const mountedRef = useRef(true);
  const greetingAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const featureAnim = useRef(new Animated.Value(0)).current;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState('');

  const isPlayer = useMemo(() => isPlayerSession(session), [session]);
  const user = session?.user || session?.profile || session || null;

  const avatarImage =
    user?.avatar ||
    user?.avatar_url ||
    user?.image ||
    user?.profile_image ||
    user?.photo ||
    user?.photo_url ||
    null;
  const avatarInitials = useMemo(() => getInitials(user), [user]);

  const fallbackName = t('home.defaultName');
  const displayName = useMemo(() => getDisplayName(user, fallbackName), [fallbackName, user]);

  const cityLabel = useMemo(
    () => user?.city || user?.academy_city || trending?.[0]?.city || t('home.defaultCity'),
    [t, trending, user]
  );
  const countryLabel = useMemo(
    () => user?.country || trending?.[0]?.country || t('home.defaultCountry'),
    [t, trending, user]
  );

  const locationText = useMemo(
    () => t('home.location', { city: cityLabel, country: countryLabel }),
    [cityLabel, countryLabel, t]
  );

  const greetingText = useMemo(() => {
    const timeOfDay = t(getTimeOfDayKey(new Date().getHours()));
    return t('home.greeting', { timeOfDay, name: displayName });
  }, [displayName, t]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en'),
    [language]
  );

  const heroHeight = useMemo(() => Math.min(320, Math.max(272, width * 0.72)), [width]);

  const featureImageSource = useMemo(
    () => resolveVenueImage(trending?.[0]) || FALLBACK_FEATURE_IMAGE,
    [trending]
  );

  const quickAccessSubtitle = useMemo(
    () =>
      t('home.quickAccessSubtitle', {
        count: numberFormatter.format(PLACEHOLDER_PLAYERS_BOOKED),
        city: cityLabel,
      }),
    [cityLabel, numberFormatter, t]
  );

  const trendingSubtitle = useMemo(
    () =>
      t('home.trendingSubtitle', {
        count: numberFormatter.format(PLACEHOLDER_WEEKLY_BOOKINGS),
        city: cityLabel,
      }),
    [cityLabel, numberFormatter, t]
  );

  const activitySession =
    session?.next_training_session ||
    session?.nextSession ||
    session?.academy_profile?.next_training ||
    t('home.defaultSession');
  const activityTime = session?.next_training_time || session?.nextSessionTime || '18:00';
  const activityAcademy =
    session?.academy_name || session?.academy?.name || session?.academy_profile?.academy_name || t('home.defaultAcademy');

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true);
    setTrendingError('');

    try {
      const res = await playgroundsApi.listVenues({});
      const list = Array.isArray(res?.venues) ? res.venues : [];
      if (!mountedRef.current) return;
      setTrending(list.slice(0, 8));
    } catch (error) {
      if (!mountedRef.current) return;
      const normalized = normalizeApiError(error);
      setTrendingError(normalized.message || t('services.trending.error'));
      setTrending([]);
    } finally {
      if (!mountedRef.current) return;
      setTrendingLoading(false);
    }
  }, [t]);

  useEffect(() => {
    mountedRef.current = true;
    loadTrending();
    return () => {
      mountedRef.current = false;
    };
  }, [loadTrending]);

  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(greetingAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(ctaAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(featureAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [ctaAnim, featureAnim, greetingAnim]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      router.replace('/(auth)/login');
    }
  }, [logout, router]);

  const handleExploreAcademies = useCallback(() => {
    router.push('/academies');
  }, [router]);

  const handleViewCourts = useCallback(() => {
    router.push('/playgrounds/explore');
  }, [router]);

  const portalRoute = isPlayer ? '/portal/home' : '/(auth)/login?mode=player&lockMode=1';
  const handleOpenPortal = useCallback(() => {
    router.push(portalRoute);
  }, [portalRoute, router]);

  const quickAccessItems = useMemo(
    () => [
      {
        id: 'discover',
        icon: 'compass',
        color: colors.accentOrange,
        title: t('home.discoverAcademies'),
        description: t('home.discoverAcademiesDesc'),
        onPress: handleExploreAcademies,
      },
      {
        id: 'portal',
        icon: 'user',
        color: colors.info,
        title: t('home.playerPortal'),
        description: t('home.playerPortalDesc'),
        onPress: handleOpenPortal,
      },
      {
        id: 'playgrounds',
        icon: 'map',
        color: colors.success,
        title: t('home.playgroundsLabel'),
        description: t('home.playgroundsDesc'),
        onPress: handleViewCourts,
      },
      {
        id: 'events',
        icon: 'calendar',
        color: colors.warning,
        title: t('home.events'),
        description: t('home.eventsDesc'),
        badgeText: t('home.soon'),
        // TODO: Wire this to the events route once the route is available.
        onPress: undefined,
      },
    ],
    [
      colors.accentOrange,
      colors.info,
      colors.success,
      colors.warning,
      handleExploreAcademies,
      handleOpenPortal,
      handleViewCourts,
      t,
    ]
  );

  const handleOpenVenue = useCallback(
    (item) => {
      if (!item?.id) return;
      router.push(`/playgrounds/venue/${item.id}`);
    },
    [router]
  );

  return (
    <AppScreen
      scroll
      safe={false}
      paddingHorizontal={0}
      paddingTop={0}
      paddingBottom={0}
      contentStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing['4xl'] }]}
    >
      <HeroHeader
        colors={colors}
        heroHeight={heroHeight}
        insetsTop={insets.top}
        isRTL={isRTL}
        greetingText={greetingText}
        locationText={locationText}
        t={t}
        avatarImage={avatarImage}
        avatarInitials={avatarInitials}
        onExplorePress={handleExploreAcademies}
        onSettingsPress={() => setSettingsOpen(true)}
        greetingAnimatedStyle={entranceStyle(greetingAnim)}
        ctaAnimatedStyle={entranceStyle(ctaAnim)}
      />

      <Animated.View style={[styles.featureWrap, entranceStyle(featureAnim)]}>
        <FeatureBookingCard
          colors={colors}
          imageSource={featureImageSource}
          isRTL={isRTL}
          onPress={handleViewCourts}
          slotsText={t('home.slotsLeft', { count: PLACEHOLDER_SLOTS_LEFT })}
          t={t}
        />
      </Animated.View>

      <QuickAccessGrid colors={colors} isRTL={isRTL} items={quickAccessItems} subtitle={quickAccessSubtitle} t={t} />

      <QuickSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogoutPress={() => {
          setSettingsOpen(false);
          setLogoutOpen(true);
        }}
      />

      <Modal transparent visible={logoutOpen} animationType="fade" onRequestClose={() => setLogoutOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLogoutOpen(false)} />
        <View
          style={[
            styles.confirmCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              bottom: insets.bottom + spacing['3xl'],
            },
          ]}
        >
          <Text variant="h4" weight="bold">
            {t('services.settings.logoutTitle')}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.confirmText}>
            {t('services.settings.logoutMessage')}
          </Text>
          <View style={[styles.confirmActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Button variant="secondary" size="small" onPress={() => setLogoutOpen(false)} style={styles.confirmActionButton}>
              {t('services.settings.logoutCancel')}
            </Button>
            <Button
              size="small"
              onPress={handleLogout}
              style={styles.confirmActionButton}
              accessibilityLabel={t('services.settings.logoutConfirmAccessibility')}
            >
              {t('services.settings.logoutConfirm')}
            </Button>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing['4xl'],
  },

  hero: {
    width: '100%',
    overflow: 'hidden',
  },
  heroGlowPrimary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -72,
    left: -86,
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: 18,
    right: -58,
  },
  heroGlowTertiary: {
    position: 'absolute',
    width: 300,
    height: 130,
    borderRadius: 120,
    bottom: -66,
    left: 28,
    transform: [{ rotate: '-8deg' }],
  },
  heroTopRow: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandPill: {
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  brandLogo: {
    width: 24,
    height: 24,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingBlock: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  greetingText: {
    lineHeight: 34,
  },
  locationPill: {
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroCtaWrap: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  heroCtaButton: {
    borderRadius: borderRadius.lg,
    minWidth: 180,
    ...shadow.md,
  },
  heroCtaText: {
    fontWeight: '700',
  },

  featureWrap: {
    marginTop: -44,
    paddingHorizontal: spacing.lg,
  },
  featureCard: {
    borderRadius: borderRadius.xl,
    ...shadow.lg,
  },
  featureCardInner: {
    alignItems: 'stretch',
    justifyContent: 'space-between',
    padding: spacing.lg,
    gap: spacing.md,
  },
  featureCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  slotsRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  slotsIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    maxWidth: 190,
  },
  featureButton: {
    alignSelf: 'flex-start',
  },
  featureImageWrap: {
    width: 126,
    minHeight: 130,
  },

  sectionWrap: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },

  quickGrid: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  quickCard: {
    width: '48.5%',
    minHeight: 156,
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },
  quickIconWrap: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickCardDescription: {
    minHeight: 34,
  },
  soonChip: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },

  segmentedPill: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  segmentedActive: {
    flex: 1,
    minHeight: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentedInactive: {
    flex: 1,
    minHeight: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },

  trendingList: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  trendingCard: {
    width: 194,
    overflow: 'hidden',
  },
  trendingImageWrap: {
    height: 156,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  trendingLogoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingLogo: {
    width: 28,
    height: 28,
  },
  ratingPill: {
    position: 'absolute',
    top: spacing.sm,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignItems: 'center',
    gap: 4,
  },
  distancePill: {
    position: 'absolute',
    bottom: spacing.sm,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignItems: 'center',
    gap: 4,
  },
  trendingTitleWrap: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  trendingSkeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  trendingSkeletonCard: {
    width: 194,
    gap: spacing.sm,
  },
  trendingSkeletonImage: {
    width: '100%',
  },

  snapshotCard: {
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  snapshotAccent: {
    position: 'absolute',
    width: 4,
    top: spacing.md,
    bottom: spacing.md,
    borderRadius: borderRadius.pill,
  },
  snapshotRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  snapshotTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  portalCtaButton: {
    alignSelf: 'center',
  },

  errorCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  confirmCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  confirmText: {
    marginBottom: spacing.sm,
  },
  confirmActions: {
    gap: spacing.sm,
  },
  confirmActionButton: {
    flex: 1,
  },
});
