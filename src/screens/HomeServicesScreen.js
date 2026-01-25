import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '../components/ui/Screen';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { QuickSettingsSheet } from '../components/services/QuickSettingsSheet';
import { ServiceCard } from '../components/services/ServiceCard';
import { TrendingVenueCard } from '../components/services/TrendingVenueCard';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { useAuth } from '../services/auth/auth.store';
import { getAvailableServices } from '../services/services/services.catalog';
import { endpoints } from '../services/api/endpoints';
import { API_BASE_URL } from '../services/api/client';
import { borderRadius, shadows, spacing } from '../theme/tokens';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState('');

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
      setTrending(list.slice(0, 8));
    } catch (error) {
      setTrendingError(error?.message || t('services.trending.error'));
      setTrending([]);
    } finally {
      setTrendingLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const services = getAvailableServices(session).map((service) => ({
    ...service,
    title: t(service.titleKey),
    description: t(service.descriptionKey),
    color: colors[service.colorKey] || colors.accentOrange,
  }));

  const avatarInitials = useMemo(() => getInitials(session?.user), [session?.user]);
  const avatarImage = session?.user?.avatar || session?.user?.image || session?.user?.photo || null;

  const isPlayer = session?.login_as === 'player' || session?.user?.type === 'player';

  return (
    <Screen safe scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={[styles.brandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.brandInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.logoWrap, { backgroundColor: `${colors.accentOrange}1A` }]}> 
              <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.brandText}>
              <Text variant="h2" weight="bold">
                SporHive
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('services.subtitle')}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => setSettingsOpen(true)} style={styles.avatarWrap}>
            <View style={[styles.avatarRing, { borderColor: colors.accentOrange }]}> 
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
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="h3" weight="bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
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
        <Text variant="h4" weight="bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {t('services.trendingTitle')}
        </Text>
      </View>

      {trendingLoading ? (
        <View style={styles.trendingSkeletonRow}>
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={`trend-skeleton-${index}`} style={styles.trendingSkeletonCard}>
              <Skeleton height={120} radius={borderRadius.lg} mode={isDark ? 'dark' : 'light'} />
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

      <View style={[styles.bottomNav, { backgroundColor: colors.surface }]}> 
        {[
          { id: 'services', icon: 'grid', label: t('tabs.home'), href: '/services' },
          { id: 'discover', icon: 'compass', label: t('tabs.discover'), href: '/academies' },
          { id: 'book', icon: 'calendar', label: t('tabs.book'), href: '/playgrounds/explore' },
          ...(isPlayer
            ? [{ id: 'portal', icon: 'user', label: t('tabs.portal'), href: '/portal/(tabs)/home' }]
            : []),
        ].map((tab) => {
          const active = tab.id === 'services';
          return (
            <Pressable
              key={tab.id}
              onPress={() => router.replace(tab.href)}
              style={({ pressed }) => [styles.tabItem, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather
                name={tab.icon}
                size={20}
                color={active ? colors.accentOrange : colors.textMuted}
              />
              <Text
                variant="caption"
                weight={active ? 'bold' : 'medium'}
                style={{ color: active ? colors.accentOrange : colors.textMuted }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  brandRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandInfo: {
    alignItems: 'center',
    gap: spacing.md,
  },
  brandText: {
    gap: 2,
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
    width: 160,
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
  bottomNav: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...shadows.md,
  },
  tabItem: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
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
