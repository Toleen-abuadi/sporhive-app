import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  I18nManager,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Banknote,
  CalendarDays,
  CreditCard,
  Image as ImageIcon,
  MapPin,
  Ruler,
  Share2,
  Star,
  Users,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { AppScreen } from '../../components/ui/AppScreen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Card } from '../../components/ui/Card';
import { BackButton } from '../../components/ui/BackButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { SmartImage } from '../../components/ui/SmartImage';
import { useToast } from '../../components/ui/ToastHost';
import { API_BASE_URL } from '../../services/api/client';
import { usePlaygroundsActions, usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { borderRadius, shadows, spacing } from '../../theme/tokens';
import { useSmartBack } from '../../navigation/useSmartBack';

const CURRENCY = 'JOD';
const CTA_BAR_HEIGHT = 108;
const MAX_CONTENT_WIDTH = 920;

const FEATURE_LABELS = {
  bibs: 'service.playgrounds.venue.features.bibs',
  water: 'service.playgrounds.venue.features.water',
  toilets: 'service.playgrounds.venue.features.toilets',
  toilet: 'service.playgrounds.venue.features.toilets',
  parking: 'service.playgrounds.venue.features.parking',
  ac: 'service.playgrounds.venue.features.ac',
  indoor: 'service.playgrounds.venue.features.indoor',
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function normalizeImageUrl(uri) {
  if (!uri || typeof uri !== 'string') return null;
  if (uri.startsWith('http')) return uri;
  const normalized = uri.startsWith('/') ? uri : `/${uri}`;
  return `${API_BASE_URL}${normalized}`;
}

function normalizeStringList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => `${item}`.trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function uniqueStrings(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item || ''}`.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getVenueImages(venue) {
  if (!venue) return [];
  const gallery = Array.isArray(venue?.images)
    ? venue.images
    : Array.isArray(venue?.venue_images)
    ? venue.venue_images
    : [];

  const raw = [
    venue?.image,
    ...gallery.map((img) => img?.url || img?.filename || img?.path || ''),
    venue?.academy_profile?.hero_image,
  ]
    .map((item) => normalizeImageUrl(item))
    .filter(Boolean);

  return uniqueStrings(raw);
}

function formatMoney(amount, locale) {
  const parsed = toNumber(amount);
  if (parsed === null) return null;
  try {
    const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-JO' : 'en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
    });
    return `${formatter.format(parsed)} ${CURRENCY}`;
  } catch {
    return `${parsed.toFixed(parsed % 1 === 0 ? 0 : 2)} ${CURRENCY}`;
  }
}

function normalizeFeatureTags(venue) {
  const tags = [
    ...normalizeStringList(venue?.tags),
    ...normalizeStringList(venue?.features),
    ...normalizeStringList(venue?.amenities),
  ];
  return tags.map((tag) => tag.toLowerCase()).filter(Boolean);
}

function mapVenueFeatures(venue, t) {
  const tags = normalizeFeatureTags(venue);
  const mapped = Object.keys(FEATURE_LABELS).filter((key) => tags.includes(key));
  return mapped.map((key) => ({ key, label: t(FEATURE_LABELS[key]) }));
}

function resolveAvailability(venue) {
  const status = `${venue?.status || venue?.availability_status || ''}`.toLowerCase();
  return (
    venue?.is_open === true ||
    venue?.is_available === true ||
    venue?.open_now === true ||
    status.includes('open') ||
    status.includes('available')
  );
}

const VenueDetailsSkeleton = memo(function VenueDetailsSkeleton({ contentWidth, heroHeight, isDark, insets }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingBottom: spacing['4xl'],
        alignItems: 'center',
      }}
    >
      <View style={{ width: contentWidth, gap: spacing.md }}>
        <Skeleton
          width={contentWidth}
          height={heroHeight}
          radius={borderRadius.xl}
          mode={isDark ? 'dark' : 'light'}
        />
        <Skeleton width="70%" height={28} radius={borderRadius.md} mode={isDark ? 'dark' : 'light'} />
        <Skeleton width="55%" height={16} radius={borderRadius.md} mode={isDark ? 'dark' : 'light'} />
        <Skeleton width={contentWidth} height={168} radius={borderRadius.lg} mode={isDark ? 'dark' : 'light'} />
        <Skeleton width={contentWidth} height={160} radius={borderRadius.lg} mode={isDark ? 'dark' : 'light'} />
      </View>
    </ScrollView>
  );
});

export function VenueDetailsScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL, locale } = useTranslation();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { venueId } = useLocalSearchParams();
  const { goBack } = useSmartBack({ fallbackRoute: '/playgrounds/explore' });

  const heroListRef = useRef(null);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const rtl = typeof isRTL === 'boolean' ? isRTL : I18nManager.isRTL;
  const rowDirection = rtl ? 'row-reverse' : 'row';

  const resolvedVenueId = useMemo(() => {
    const raw = Array.isArray(venueId) ? venueId[0] : venueId;
    return typeof raw === 'string' ? raw.trim() : raw ? String(raw).trim() : '';
  }, [venueId]);

  const hasVenueId = Boolean(resolvedVenueId);

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState('');

  // ✅ durations removed
  const { activities } = usePlaygroundsStore((state) => ({
    activities: state.activities,
  }));
  const { getVenueDetails, listActivities } = usePlaygroundsActions();

  const activityMap = useMemo(() => {
    return new Map(activities.map((activity) => [String(activity.id), activity.name || '']));
  }, [activities]);

  const loadVenue = useCallback(async () => {
    setLoading(true);
    setError('');
    setErrorKind('');

    try {
      const res = await getVenueDetails(resolvedVenueId);
      if (res?.success && res.data) {
        setVenue(res.data);
      } else {
        setVenue(null);
        setErrorKind('not_found');
        setError(res?.error?.message || t('service.playgrounds.venue.errors.notFound'));
      }

      if (!activities.length) {
        await listActivities({ include_inactive: false });
      }

      // ✅ getVenueDurations removed
    } catch (err) {
      setErrorKind('load');
      setError(err?.message || t('service.playgrounds.venue.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [activities.length, getVenueDetails, listActivities, resolvedVenueId, t]);

  useEffect(() => {
    if (!hasVenueId) return;
    loadVenue();
  }, [hasVenueId, loadVenue]);

  const contentWidth = useMemo(() => {
    const available = Math.max(320, screenWidth - spacing.lg * 2);
    return Math.min(available, MAX_CONTENT_WIDTH);
  }, [screenWidth]);

  const heroHeight = useMemo(() => {
    const dynamic = Math.round(contentWidth * 0.62);
    return Math.max(236, Math.min(dynamic, 372));
  }, [contentWidth]);

  const academy = venue?.academy_profile || null;
  const locationText =
    academy?.location_text ||
    venue?.base_location ||
    [venue?.city, venue?.country].filter(Boolean).join(', ') ||
    t('service.playgrounds.common.locationPending');

  const venueName = venue?.name || venue?.title || t('service.playgrounds.common.playground');
  const academyName =
    academy?.public_name ||
    academy?.name ||
    academy?.title ||
    t('service.playgrounds.venue.academy.defaultName');

  const mapsUrl = academy?.maps_url || venue?.maps_url || '';
  const isVenueAvailable = resolveAvailability(venue);

  const slots = venue?.slots || venue?.available_slots || [];
  const allCandidatePrices = [
    venue?.price,
    venue?.price_from,
    venue?.starting_price,
    ...slots.map((item) => item?.price),
  ]
    .map((item) => toNumber(item))
    .filter((item) => item !== null);

  const priceValue = allCandidatePrices.length ? Math.min(...allCandidatePrices) : null;
  const formattedPrice = formatMoney(priceValue, locale);

  const ratingValue = toNumber(venue?.avg_rating ?? venue?.rating);
  const hasRatingValue = ratingValue !== null;
  const ratingsCount =
    toNumber(venue?.ratings_count ?? venue?.rating_count ?? venue?.reviews_count) || 0;

  const ratingStat = hasRatingValue
    ? `${ratingValue.toFixed(1)} ${t('venueDetails.reviewsCount', { count: ratingsCount })}`
    : t('service.playgrounds.common.placeholder');

  const minPlayers = toNumber(venue?.min_players);
  const maxPlayers = toNumber(venue?.max_players);
  const playersValue =
    minPlayers && maxPlayers
      ? `${Math.round(minPlayers)} - ${Math.round(maxPlayers)}`
      : minPlayers || maxPlayers
      ? `${Math.round(minPlayers || maxPlayers || 0)}`
      : t('service.playgrounds.common.placeholder');

  const activityName = venue?.activity_id ? activityMap.get(String(venue?.activity_id)) : null;

  const featureLabels = useMemo(
    () => (venue ? mapVenueFeatures(venue, t).map((item) => item.label) : []),
    [t, venue],
  );

  const tags = useMemo(() => {
    const merged = [
      ...normalizeStringList(academy?.tags),
      ...normalizeStringList(venue?.tags),
      ...normalizeStringList(venue?.features),
      ...normalizeStringList(venue?.amenities),
      ...featureLabels,
    ];
    return uniqueStrings(merged).slice(0, 16);
  }, [academy?.tags, featureLabels, venue?.amenities, venue?.features, venue?.tags]);

  const specialOfferNote = `${venue?.special_offer_note || ''}`.trim();
  const academyOfferNote = `${academy?.special_offers_note || ''}`.trim();
  const showSpecialOffers =
    Boolean(venue?.has_special_offer) || Boolean(specialOfferNote) || Boolean(academyOfferNote);

  const paymentRows = useMemo(() => {
    const rows = [];
    if (academy?.allow_cash) {
      rows.push({
        key: 'cash',
        icon: Banknote,
        label: t('venueDetails.cash'),
        value: t('service.playgrounds.booking.payment.cashDescription'),
      });
    }
    if (academy?.allow_cash_on_date) {
      const extraType = `${academy?.cash_on_date_extra_type || ''}`.trim();
      const extraValue = `${academy?.cash_on_date_extra_value || ''}`.trim();
      rows.push({
        key: 'cash_on_date',
        icon: CalendarDays,
        label: t('venueDetails.cashOnDate'),
        value:
          [extraType, extraValue].filter(Boolean).join(': ') ||
          t('service.playgrounds.booking.payment.payOnDate'),
      });
    }
    if (academy?.allow_cliq) {
      rows.push({
        key: 'cliq',
        icon: CreditCard,
        label: t('venueDetails.cliq'),
        value:
          [academy?.cliq_name, academy?.cliq_number]
            .map((item) => `${item || ''}`.trim())
            .filter(Boolean)
            .join(' • ') || t('service.playgrounds.booking.payment.cliq'),
      });
    }
    return rows;
  }, [
    academy?.allow_cash,
    academy?.allow_cash_on_date,
    academy?.allow_cliq,
    academy?.cash_on_date_extra_type,
    academy?.cash_on_date_extra_value,
    academy?.cliq_name,
    academy?.cliq_number,
    t,
  ]);

  const heroImages = useMemo(() => {
    const resolved = getVenueImages(venue);
    return resolved.length ? resolved : [null];
  }, [venue]);

  const galleryImages = useMemo(() => heroImages.filter(Boolean), [heroImages]);
  const hasAcademyDetails = Boolean(`${academy?.slug || ''}`.trim());

  const stats = useMemo(
    () => [
      { key: 'players', icon: Users, label: t('venueDetails.players'), value: playersValue },
      {
        key: 'pitch',
        icon: Ruler,
        label: t('venueDetails.pitchSize'),
        value: `${venue?.pitch_size || t('service.playgrounds.common.placeholder')}`,
      },
      {
        key: 'area',
        icon: MapPin,
        label: t('venueDetails.areaSize'),
        value: `${venue?.area_size || t('service.playgrounds.common.placeholder')}`,
      },
      { key: 'rating', icon: Star, label: t('venueDetails.rating'), value: ratingStat },
    ],
    [playersValue, ratingStat, t, venue?.area_size, venue?.pitch_size],
  );

  const statColumns = screenWidth >= 740 ? 4 : 2;
  const statWidth = `${100 / statColumns}%`;

  const handleHeroMomentumEnd = useCallback(
    (event) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / contentWidth);
      if (Number.isFinite(next)) {
        setActiveHeroIndex(Math.max(0, Math.min(next, heroImages.length - 1)));
      }
    },
    [contentWidth, heroImages.length],
  );

  const handleJumpToHero = useCallback((index) => {
    if (!heroListRef.current) return;
    heroListRef.current.scrollToIndex({ index, animated: true });
    setActiveHeroIndex(index);
  }, []);

  const handleOpenMaps = useCallback(async () => {
    if (!mapsUrl) {
      toast.error(t('venueDetails.unableToOpenMaps'));
      return;
    }
    try {
      const supported = await Linking.canOpenURL(mapsUrl);
      if (!supported) throw new Error('unsupported_url');
      await Linking.openURL(mapsUrl);
    } catch {
      toast.error(t('venueDetails.unableToOpenMaps'));
    }
  }, [mapsUrl, t, toast]);

  const handleShare = useCallback(async () => {
    try {
      const shareMessage = [venueName, mapsUrl].filter(Boolean).join('\n');
      await Share.share({ message: shareMessage });
    } catch {
      // noop
    }
  }, [mapsUrl, venueName]);

  const handleBookNow = useCallback(() => {
    if (!venue?.id) return;
    router.push(`/playgrounds/book/${venue.id}`);
  }, [router, venue?.id]);

  const handleViewAcademy = useCallback(() => {
    const slug = `${academy?.slug || ''}`.trim();
    if (!slug) return;
    router.push(`/academies/${slug}`);
  }, [academy?.slug, router]);

  const renderHeroItem = useCallback(
    ({ item }) => (
      <SmartImage
        source={item}
        style={{ width: contentWidth, height: heroHeight }}
        imageStyle={styles.heroImage}
        borderRadius={borderRadius.xl}
        accessibilityLabel={venueName}
      />
    ),
    [contentWidth, heroHeight, venueName],
  );

  const renderGalleryItem = useCallback(
    ({ item, index }) => (
      <Pressable
        onPress={() => handleJumpToHero(index)}
        style={[
          styles.galleryItem,
          {
            borderColor: activeHeroIndex === index ? colors.accentOrange : colors.border,
          },
        ]}
      >
        <SmartImage source={item} borderRadius={borderRadius.md} />
      </Pressable>
    ),
    [activeHeroIndex, colors.accentOrange, colors.border, handleJumpToHero],
  );

  if (!hasVenueId) {
    return (
      <AppScreen safe={false} noPadding withBottomNavPadding={false}>
        <View style={[styles.topBackRow, { paddingTop: insets.top + spacing.sm }]}>
          <BackButton onPress={goBack} fallbackRoute="/playgrounds/explore" />
        </View>
        <EmptyState
          title={t('venueDetails.notFoundTitle')}
          message={t('errors.missingParamsMessage')}
          actionLabel={t('common.back')}
          onAction={goBack}
        />
      </AppScreen>
    );
  }

  if (loading) {
    return (
      <AppScreen safe={false} noPadding withBottomNavPadding={false}>
        <View style={[styles.topBackRow, { paddingTop: insets.top + spacing.sm }]}>
          <BackButton onPress={goBack} fallbackRoute="/playgrounds/explore" />
        </View>
        <VenueDetailsSkeleton contentWidth={contentWidth} heroHeight={heroHeight} isDark={isDark} insets={insets} />
      </AppScreen>
    );
  }

  if (errorKind === 'load') {
    return (
      <AppScreen safe={false} noPadding withBottomNavPadding={false}>
        <View style={[styles.topBackRow, { paddingTop: insets.top + spacing.sm }]}>
          <BackButton onPress={goBack} fallbackRoute="/playgrounds/explore" />
        </View>
        <ErrorState
          title={t('playgrounds.explore.errorTitle', t('common.error'))}
          message={error || t('service.playgrounds.venue.errors.load')}
          actionLabel={t('common.retry')}
          onAction={loadVenue}
        />
      </AppScreen>
    );
  }

  if (!venue || errorKind === 'not_found') {
    return (
      <AppScreen safe={false} noPadding withBottomNavPadding={false}>
        <View style={[styles.topBackRow, { paddingTop: insets.top + spacing.sm }]}>
          <BackButton onPress={goBack} fallbackRoute="/playgrounds/explore" />
        </View>
        <EmptyState
          title={t('venueDetails.notFoundTitle')}
          message={t('venueDetails.notFoundMessage')}
          actionLabel={t('common.back')}
          onAction={goBack}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen safe={false} noPadding withBottomNavPadding={false}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing.sm,
            paddingBottom: CTA_BAR_HEIGHT + insets.bottom + spacing['3xl'],
            alignItems: 'center',
          }}
        >
          <View style={{ width: contentWidth }}>
            <View
              style={[
                styles.heroCard,
                {
                  height: heroHeight,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <FlatList
                ref={heroListRef}
                data={heroImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => (item ? `${item}-${index}` : `hero-fallback-${index}`)}
                renderItem={renderHeroItem}
                onMomentumScrollEnd={handleHeroMomentumEnd}
                initialNumToRender={1}
                maxToRenderPerBatch={2}
                windowSize={3}
              />
              <View style={[styles.heroShade, { backgroundColor: `${colors.black}40` }]} />
              <View
                style={[
                  styles.heroOverlay,
                  {
                    paddingTop: insets.top + spacing.sm,
                    paddingBottom: spacing.md,
                  },
                ]}
              >
                <View style={[styles.heroTopRow, { flexDirection: rowDirection }]}>
                  <View
                    style={[
                      styles.overlayControl,
                      {
                        borderColor: colors.border,
                        backgroundColor: `${colors.surface}E8`,
                      },
                    ]}
                  >
                    <BackButton onPress={goBack} fallbackRoute="/playgrounds/explore" style={styles.overlayBackButton} />
                  </View>

                  <Pressable
                    onPress={handleShare}
                    style={[
                      styles.overlayControl,
                      {
                        borderColor: colors.border,
                        backgroundColor: `${colors.surface}E8`,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t('service.playgrounds.venue.actions.share')}
                  >
                    <Share2 size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>

                <View style={[styles.heroBadges, { flexDirection: rowDirection }]}>
                  {venue?.has_special_offer ? (
                    <View style={[styles.heroBadge, { backgroundColor: `${colors.accentOrange}E6` }]}>
                      <Text variant="caption" weight="bold" color={colors.white}>
                        {t('service.playgrounds.venue.academy.specialOffer')}
                      </Text>
                    </View>
                  ) : null}

                  {isVenueAvailable ? (
                    <View style={[styles.heroBadge, { backgroundColor: `${colors.success}D6` }]}>
                      <Text variant="caption" weight="bold" color={colors.white}>
                        {t('playgrounds.discovery.availableNow')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {hasRatingValue ? (
                <View
                  style={[
                    styles.ratingBadge,
                    {
                      right: rtl ? undefined : spacing.md,
                      left: rtl ? spacing.md : undefined,
                      backgroundColor: `${colors.surface}EA`,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Star size={13} color={colors.accentOrange} />
                  <Text variant="caption" weight="bold">
                    {ratingValue.toFixed(1)}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {t('venueDetails.reviewsCount', { count: ratingsCount })}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.heroCopy}>
              <Text variant="h2" weight="bold">
                {venueName}
              </Text>
              <Text variant="bodyMedium" color={colors.textSecondary}>
                {academyName}
              </Text>

              <View style={[styles.iconTextRow, { flexDirection: rowDirection }]}>
                <MapPin size={14} color={colors.textMuted} />
                <Text variant="bodySmall" color={colors.textSecondary} style={styles.flexText}>
                  {locationText}
                </Text>
              </View>

              <View style={[styles.chipRow, { flexDirection: rowDirection }]}>
                {activityName ? <Chip label={activityName} /> : null}
                <Chip label={formattedPrice || t('venueDetails.priceOnRequest')} selected />
              </View>
            </View>

            <Card
              padding="medium"
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.statsGrid, { flexDirection: rowDirection }]}>
                {stats.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <View key={item.key} style={[styles.statCellWrap, { width: statWidth }]}>
                      <View
                        style={[
                          styles.statCell,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.surfaceElevated,
                          },
                        ]}
                      >
                        <IconComp size={14} color={colors.accentOrange} />
                        <Text variant="bodySmall" weight="semibold" style={styles.statValue}>
                          {item.value}
                        </Text>
                        <Text variant="caption" color={colors.textSecondary}>
                          {item.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* ✅ Price section removed, keep payment methods */}
            <Card
              padding="medium"
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.sectionHeaderRow, { flexDirection: rowDirection }]}>
                <CreditCard size={16} color={colors.accentOrange} />
                <Text variant="body" weight="bold">
                  {t('venueDetails.paymentMethods')}
                </Text>
              </View>

              {paymentRows.length ? (
                <View style={styles.paymentRows}>
                  {paymentRows.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <View
                        key={item.key}
                        style={[
                          styles.paymentRow,
                          {
                            flexDirection: rowDirection,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={[styles.iconTextRow, { flexDirection: rowDirection }]}>
                          <IconComp size={14} color={colors.textMuted} />
                          <Text variant="bodySmall" weight="semibold">
                            {item.label}
                          </Text>
                        </View>
                        <Text variant="bodySmall" color={colors.textSecondary} style={styles.paymentValue}>
                          {item.value}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.common.placeholder')}
                </Text>
              )}
            </Card>

            {tags.length ? (
              <Card
                padding="medium"
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text variant="body" weight="bold">
                  {t('service.playgrounds.venue.features.title')}
                </Text>
                <View style={[styles.chipRow, { flexDirection: rowDirection }]}>
                  {tags.map((tag) => (
                    <Chip key={tag} label={tag} />
                  ))}
                </View>
              </Card>
            ) : null}

            {showSpecialOffers ? (
              <Card
                padding="medium"
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.accentOrangeSoft,
                    borderColor: colors.accentOrange,
                  },
                ]}
              >
                <View style={[styles.sectionHeaderRow, { flexDirection: rowDirection }]}>
                  <Star size={16} color={colors.accentOrange} />
                  <Text variant="body" weight="bold" color={colors.accentOrange}>
                    {t('venueDetails.specialOffers')}
                  </Text>
                </View>
                {specialOfferNote ? <Text variant="bodySmall">{specialOfferNote}</Text> : null}
                {academyOfferNote ? <Text variant="bodySmall">{academyOfferNote}</Text> : null}
              </Card>
            ) : null}

            {/* ✅ Address card removed, keep location card */}
            <Card
              padding="medium"
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.sectionHeaderRow, { flexDirection: rowDirection }]}>
                <MapPin size={16} color={colors.accentOrange} />
                <Text variant="body" weight="bold">
                  {t('venueDetails.location')}
                </Text>
              </View>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {locationText}
              </Text>
              <Button
                variant="secondary"
                onPress={handleOpenMaps}
                accessibilityLabel={t('venueDetails.openInGoogleMaps')}
              >
                {t('venueDetails.openInGoogleMaps')}
              </Button>
            </Card>

            {galleryImages.length > 1 ? (
              <Card
                padding="medium"
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.sectionHeaderRow, { flexDirection: rowDirection }]}>
                  <ImageIcon size={16} color={colors.accentOrange} />
                  <Text variant="body" weight="bold">
                    {t('academy.details.images')}
                  </Text>
                </View>
                <FlatList
                  data={galleryImages}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  renderItem={renderGalleryItem}
                  contentContainerStyle={styles.galleryList}
                />
              </Card>
            ) : null}
          </View>
        </ScrollView>

        <View
          style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.ctaBar,
              {
                width: contentWidth,
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.ctaButtons, { flexDirection: rowDirection }]}>
              {hasAcademyDetails ? (
                <Button variant="secondary" style={styles.ctaSecondary} onPress={handleViewAcademy}>
                  {t('venueDetails.viewAcademy')}
                </Button>
              ) : (
                <Button variant="secondary" style={styles.ctaSecondary} onPress={handleShare}>
                  {t('common.share')}
                </Button>
              )}

              <Button
                style={styles.ctaPrimary}
                onPress={handleBookNow}
                accessibilityLabel={t('service.playgrounds.venue.cta.bookAccessibility')}
              >
                {t('venueDetails.bookNow')}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBackRow: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 5,
  },

  heroCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.md,
  },
  heroImage: { borderRadius: borderRadius.xl },

  heroShade: { ...StyleSheet.absoluteFillObject },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },

  heroTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  overlayControl: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  overlayBackButton: {
    width: 44,
    height: 44,
    padding: 0,
  },

  heroBadges: {
    alignItems: 'center',
    gap: spacing.sm,
  },

  heroBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  ratingBadge: {
    position: 'absolute',
    top: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  heroCopy: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },

  iconTextRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },

  flexText: { flex: 1 },

  chipRow: {
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },

  sectionCard: {
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },

  statsGrid: { flexWrap: 'wrap' },

  statCellWrap: { padding: spacing.xs },

  statCell: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
    minHeight: 84,
    justifyContent: 'center',
  },

  statValue: { textAlign: 'center' },

  sectionHeaderRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },

  paymentRows: { gap: spacing.xs },

  paymentRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  paymentValue: { flexShrink: 1 },

  galleryList: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },

  galleryItem: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
  },

  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  ctaBar: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.lg,
  },

  ctaCopy: { gap: 2 },

  ctaButtons: {
    alignItems: 'center',
    gap: spacing.sm,
  },

  ctaSecondary: { flex: 1 },
  ctaPrimary: { flex: 1 },
});