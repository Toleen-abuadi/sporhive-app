// src/screens/HomeServicesScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader } from '../components/ui/AppHeader';
import { AppScreen } from '../components/ui/AppScreen';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';

import { QuickSettingsSheet } from '../components/services/QuickSettingsSheet';
import { ServiceCard } from '../components/services/ServiceCard';
import { TrendingVenueCard } from '../components/services/TrendingVenueCard';

import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { useAuth } from '../services/auth/auth.store';
import { playgroundsApi } from '../services/playgrounds/playgrounds.api';
import { API_BASE_URL } from '../services/api/client';
import { normalizeApiError } from '../services/api/normalizeApiError';
import { spacing, borderRadius } from '../theme/tokens';

const logoSource = require('../../assets/images/logo.png');

const normalizeImageUrl = (uri) => {
  if (!uri) return null;
  if (typeof uri !== 'string') return null;
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

const getInitials = (user) => {
  const first = user?.first_name || user?.firstName || '';
  const last = user?.last_name || user?.lastName || '';
  const initials = `${first?.[0] || ''}${last?.[0] || ''}`.trim();
  return initials || user?.username?.[0] || user?.phone?.[0] || 'S';
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

export function HomeServicesScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const { logout, session } = useAuth();

  const mountedRef = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const services = useMemo(() => {
    const items = [
      {
        id: 'academies',
        title: t('services.cards.discoverTitle'),
        description: t('services.cards.discoverSubtitle'),
        icon: 'compass',
        color: colors.accentOrange,
        href: '/academies',
      },
    ];

    if (isPlayer) {
      items.push({
        id: 'portal',
        title: t('services.cards.portalTitle'),
        description: t('services.cards.portalSubtitle'),
        icon: 'user',
        color: colors.info,
        href: '/portal/(tabs)/home',
      });
    }

    items.push({
      id: 'playgrounds',
      title: t('services.cards.playgroundsTitle'),
      description: t('services.cards.playgroundsSubtitle'),
      icon: 'map-pin',
      color: colors.accentOrange,
      href: '/playgrounds/explore',
    });

    return items;
  }, [colors.accentOrange, colors.info, isPlayer, t]);

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
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      router.replace('/(auth)/login');
    }
  }, [logout, router]);

  const renderTrendingItem = useCallback(
    ({ item }) => (
      <TrendingVenueCard
        title={item?.name || item?.title || t('services.trending.fallback')}
        imageUrl={resolveVenueImage(item)}
        onPress={() => {
          if (!item?.id) return;
          // Use your existing venue-details/booking route
          router.push(`/playgrounds/venue/${item.id}`);
        }}
      />
    ),
    [router, t]
  );

  return (
    <AppScreen scroll contentStyle={styles.scrollContent}>
      <AppHeader
        title={t('home.title')}
        subtitle={t('services.subtitle')}
        showBack={false}
        variant="transparent"
        leftSlot={(
          <View style={[styles.logoWrap, { backgroundColor: `${colors.accentOrange}1A` }]}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>
        )}
        right={(
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={styles.avatarWrap}
            accessibilityLabel={t('services.settings.open')}
          >
            <View style={[styles.avatarRing, { borderColor: colors.accentOrange }]}>
              {avatarImage ? (
                <Image source={{ uri: normalizeImageUrl(avatarImage) || avatarImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.surface }]}>
                  <Text variant="body" weight="bold">
                    {avatarInitials}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: colors.success, borderColor: colors.background },
                ]}
              />
            </View>
          </Pressable>
        )}
      />

      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        }}
      >
        {/* Explore Services */}
        <View style={styles.section}>
          <Text variant="h2" weight="bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('services.exploreTitle')}
          </Text>
        </View>

        <View style={styles.cardsStack}>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              title={service.title}
              subtitle={service.description}
              icon={service.icon}
              color={service.color}
              onPress={() => service.href && router.push(service.href)}
            />
          ))}
        </View>

        {/* Trending */}
        <View style={styles.section}>
          <Text variant="h3" weight="bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('services.trendingTitle')}
          </Text>
        </View>

        {trendingLoading ? (
          <View style={styles.trendingSkeletonRow}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={`trend-skeleton-${index}`} style={styles.trendingSkeletonCard}>
                <Skeleton height={150} radius={borderRadius.xl} mode={isDark ? 'dark' : 'light'} />
                <Skeleton
                  height={14}
                  radius={borderRadius.md}
                  mode={isDark ? 'dark' : 'light'}
                  style={styles.trendingSkeletonText}
                />
              </View>
            ))}
          </View>
        ) : trendingError ? (
          <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="body" weight="semibold">
              {t('services.trending.errorTitle')}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.errorText}>
              {trendingError}
            </Text>
            <Button size="small" onPress={loadTrending} style={styles.retryButton}>
              {t('services.trending.retry')}
            </Button>
          </View>
        ) : trending.length ? (
          <FlatList
            data={trending}
            keyExtractor={(item, index) => String(item?.id ?? item?.slug ?? index)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
            renderItem={renderTrendingItem}
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
      </Animated.View>

      {/* Quick Settings */}
      <QuickSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogoutPress={() => {
          setSettingsOpen(false);
          setLogoutOpen(true);
        }}
      />

      {/* Logout confirm */}
      <Modal transparent visible={logoutOpen} animationType="fade" onRequestClose={() => setLogoutOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLogoutOpen(false)} />
        <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="h4" weight="bold">
            {t('services.settings.logoutTitle')}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.confirmText}>
            {t('services.settings.logoutMessage')}
          </Text>
          <View style={styles.confirmActions}>
            <Button variant="secondary" size="small" onPress={() => setLogoutOpen(false)}>
              {t('services.settings.logoutCancel')}
            </Button>
            <Button size="small" onPress={handleLogout} accessibilityLabel={t('services.settings.logoutConfirmAccessibility')}>
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
    paddingBottom: spacing.xl,
  },

  logoWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 26,
    height: 26,
  },

  avatarWrap: {
    padding: 4,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    bottom: -2,
    right: -2,
  },

  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  cardsStack: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  trendingList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  trendingSkeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  trendingSkeletonCard: {
    width: 180,
    gap: spacing.sm,
  },
  trendingSkeletonText: {
    marginTop: spacing.xs,
  },

  emptyCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  errorCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  errorText: {
    marginBottom: spacing.sm,
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
    bottom: 120,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
