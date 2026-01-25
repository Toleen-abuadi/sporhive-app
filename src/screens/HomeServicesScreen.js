import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
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
import { spacing, borderRadius } from '../theme/tokens';
import { endpoints } from '../services/api/endpoints';
import { API_BASE_URL } from '../services/api/client';

const logoSource = require('../../assets/images/logo.png');

const normalizeImageUrl = (uri) => {
  if (!uri) return null;
  if (uri.startsWith('http')) return uri;
  const normalized = uri.startsWith('/') ? uri : `/${uri}`;
  return `${API_BASE_URL}${normalized}`;
};

const resolveVenueImage = (venue) => {
  const images = Array.isArray(venue?.images) ? venue.images : venue?.venue_images || [];
  const url = images
    .map((img) => img?.url || img?.path || img?.filename || '')
    .find(Boolean);
  if (url) return normalizeImageUrl(url);
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

export function HomeServicesScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const { logout, session } = useAuth();
  // TODO(DesignSystem): Batch-refactor remaining screens to use AppScreen/AppHeader only.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState('');
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(12)).current;
  const isMounted = useRef(true);

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true);
    setTrendingError('');
    try {
      const res = await endpoints.playgrounds.venuesList({});
      const list = Array.isArray(res?.data?.venues)
        ? res.data.venues
        : Array.isArray(res?.venues)
        ? res.venues
        : Array.isArray(res?.data)
        ? res.data
        : [];
      if (!isMounted.current) return;
      setTrending(list.slice(0, 8));
    } catch (error) {
      if (!isMounted.current) return;
      setTrendingError(error?.message || t('services.trending.error'));
      setTrending([]);
    } finally {
      if (!isMounted.current) return;
      setTrendingLoading(false);
    }
  }, [t]);

  useEffect(() => {
    isMounted.current = true;
    loadTrending();
    return () => {
      isMounted.current = false;
    };
  }, [loadTrending]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const isPlayer =
    session?.login_as === 'player' || session?.userType === 'player' || session?.user?.type === 'player';
  const avatarImage =
    session?.user?.avatar || session?.user?.image || session?.user?.photo || session?.user?.profile_photo || null;
  const avatarInitials = getInitials(session?.user);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslate, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslate]);

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
      color: colors.success,
      href: '/playgrounds/explore',
    });

    return items;
  }, [colors.accentOrange, colors.info, colors.success, isPlayer, t]);

  return (
    <AppScreen scroll contentStyle={styles.scrollContent}>
      <AppHeader
        title="SporHive"
        subtitle={t('services.subtitle')}
        showBack={false}
        leftSlot={(
          <View style={[styles.logoWrap, { backgroundColor: colors.primarySoft }]}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>
        )}
        right={(
          <Pressable onPress={() => setSettingsOpen(true)} style={styles.avatarWrap}>
            <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
              {avatarImage ? (
                <Image source={{ uri: avatarImage }} style={styles.avatar} />
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
        style={[
          styles.contentWrap,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslate }],
          },
        ]}
      >
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

        <View style={styles.section}>
          <Text variant="h3" weight="bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('services.trendingTitle')}
          </Text>
        </View>

        {trendingLoading ? (
          <View style={styles.trendingSkeletonRow}>
            {Array.from({ length: 3 }).map((_, index) => (
              <View key={`trend-skeleton-${index}`} style={styles.trendingSkeletonCard}>
                <Skeleton height={140} radius={borderRadius.xl} mode={isDark ? 'dark' : 'light'} />
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
            keyExtractor={(item, index) => String(item?.id ?? index)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
            renderItem={({ item }) => (
              <TrendingVenueCard
                title={item?.name || item?.title || t('services.trending.fallback')}
                imageUrl={resolveVenueImage(item)}
                onPress={() => {
                  if (!item?.id) return;
                  router.push(`/playgrounds/venue/${item.id}`);
                }}
              />
            )}
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

      <QuickSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogoutPress={() => {
          setSettingsOpen(false);
          setLogoutOpen(true);
        }}
      />

      <Modal transparent visible={logoutOpen} animationType="fade">
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
            <Button size="small" onPress={handleLogout}>
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
  contentWrap: {
    flex: 1,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 28,
    height: 28,
  },
  avatarWrap: {
    padding: 4,
  },
  avatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  cardsStack: {
    gap: spacing.md,
  },
  trendingList: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  trendingSkeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  trendingSkeletonCard: {
    width: 176,
    gap: spacing.sm,
  },
  trendingSkeletonText: {
    marginTop: spacing.xs,
  },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  errorCard: {
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
