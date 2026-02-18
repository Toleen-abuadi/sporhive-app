import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Share2, Star } from 'lucide-react-native';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppScreen } from '../../components/ui/AppScreen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { IconButton } from '../../components/ui/IconButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { API_BASE_URL } from '../../services/api/client';
import {
  usePlaygroundsActions,
  usePlaygroundsStore,
} from '../../services/playgrounds/playgrounds.store';
import { borderRadius, shadows, spacing } from '../../theme/tokens';
import { useSmartBack } from '../../navigation/useSmartBack';

function getVenueImages(venue) {
  const images = venue.images || venue.venue_images || [];
  return images
    .map((img) => img?.url || img?.path || '')
    .filter(Boolean)
    .map((uri) => {
      if (uri.startsWith('http')) return uri;
      const normalized = uri.startsWith('/') ? uri : `/${uri}`;
      return `${API_BASE_URL}${normalized}`;
    });
}

const FEATURE_LABELS = {
  bibs: 'service.playgrounds.venue.features.bibs',
  water: 'service.playgrounds.venue.features.water',
  toilets: 'service.playgrounds.venue.features.toilets',
  toilet: 'service.playgrounds.venue.features.toilets',
  parking: 'service.playgrounds.venue.features.parking',
  ac: 'service.playgrounds.venue.features.ac',
  indoor: 'service.playgrounds.venue.features.indoor',
};

function normalizeFeatureTags(venue) {
  const collect = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.split(',').map((item) => item.trim());
  };
  const tags = [
    ...collect(venue.tags),
    ...collect(venue.features),
    ...collect(venue.amenities),
  ];
  return tags.map((tag) => tag.toLowerCase()).filter(Boolean);
}

function mapVenueFeatures(venue, t) {
  const tags = normalizeFeatureTags(venue);
  const mapped = Object.keys(FEATURE_LABELS).filter((key) =>
    tags.includes(key),
  );
  return mapped.map((key) => ({ key, label: t(FEATURE_LABELS[key]) }));
}

function formatMoney(amount, currency) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount)))
    return null;
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${Number(amount).toFixed(0)}`;
}

export function VenueDetailsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();
  const { goBack } = useSmartBack({ fallbackRoute: '/playgrounds/explore' });
  const [heroWidth, setHeroWidth] = useState(0);

  const resolvedVenueId = useMemo(() => {
    const raw = Array.isArray(venueId) ? venueId[0] : venueId;
    return typeof raw === 'string' ? raw.trim() : raw ? String(raw).trim() : '';
  }, [venueId]);
  const hasVenueId = Boolean(resolvedVenueId);

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { activities, durationsByVenue } = usePlaygroundsStore((state) => ({
    activities: state.activities,
    durationsByVenue: state.durationsByVenue,
  }));
  const { getVenueDetails, getVenueDurations, listActivities } =
    usePlaygroundsActions();

  const activityMap = useMemo(() => {
    return new Map(
      activities.map((activity) => [String(activity.id), activity.name || '']),
    );
  }, [activities]);

  const loadVenue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getVenueDetails(resolvedVenueId);
      if (res?.success && res.data) {
        setVenue(res.data);
      } else {
        setError(
          res?.error?.message || t('service.playgrounds.venue.errors.notFound'),
        );
      }
      if (!activities.length) {
        await listActivities({ include_inactive: false });
      }
      if (res?.success && res.data?.id) {
        await getVenueDurations(res.data.id, {
          activityId: res.data.activity_id,
          academyProfileId: res.data.academy_profile_id,
        });
      }
    } catch (err) {
      setError(err?.message || t('service.playgrounds.venue.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [
    activities.length,
    getVenueDetails,
    getVenueDurations,
    listActivities,
    t,
    resolvedVenueId,
  ]);

  useEffect(() => {
    if (!hasVenueId) return;
    loadVenue();
  }, [hasVenueId, loadVenue]);

  const location = venue
    ? [venue.city, venue.country].filter(Boolean).join(', ')
    : '';
  const ratingRaw = venue?.rating ?? venue?.avg_rating ?? null;
  const rating =
    ratingRaw !== null && ratingRaw !== undefined ? Number(ratingRaw) : null;
  const ratingsCount = venue?.ratings_count;
  const durations =
    durationsByVenue?.[venue?.id] ||
    venue?.durations ||
    venue?.venue_durations ||
    [];
  const slots = venue?.slots || venue?.available_slots || [];
  const currency =
    venue?.currency || durations?.[0]?.currency || slots?.[0]?.currency || null;
  const priceFrom =
    venue?.price_from ??
    venue?.starting_price ??
    durations?.[0]?.price ??
    slots?.[0]?.price ??
    null;
  const activityName = venue?.activity_id
    ? activityMap.get(String(venue?.activity_id))
    : null;
  const features = venue ? mapVenueFeatures(venue, t) : [];
  const academyName =
    venue?.academy_profile?.name || venue?.academy_profile?.title;
  const academyLocation =
    venue?.academy_profile?.city ||
    venue?.academy_profile?.country ||
    venue?.location_text;

  if (!hasVenueId) {
    return (
      <AppScreen safe>
        <AppHeader
          title={t('service.playgrounds.common.playground')}
          onBackPress={goBack}
          fallbackRoute="/playgrounds/explore"
        />
        <EmptyState
          title={t('errors.missingParamsTitle')}
          message={t('errors.missingParamsMessage')}
          actionLabel={t('common.goBack')}
          onAction={goBack}
          secondaryActionLabel={t('common.goHome')}
          onSecondaryAction={() => router.push('/playgrounds/explore')}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen paddingHorizontal={0} paddingTop={0} paddingBottom={0}>
      <AppHeader
        title={
          venue?.name ||
          venue?.title ||
          t('service.playgrounds.common.playground')
        }
        subtitle={location || undefined}
        onBackPress={goBack}
        fallbackRoute="/playgrounds/explore"
        variant="transparent"
        right={
          <IconButton
            icon={Share2} // ✅ pass component, not function
            size={18}
            color={colors.textPrimary}
            onPress={() => {}}
            accessibilityLabel={t('service.playgrounds.venue.actions.share')}
            style={[styles.headerIcon, { backgroundColor: colors.surface }]}
          />
        }
      />
      {loading ? (
        <SporHiveLoader message={t('service.playgrounds.venue.loading')} />
      ) : error ? (
        <View style={styles.center}>
          <Text variant="body" color={colors.textSecondary}>
            {error}
          </Text>
          <Button onPress={loadVenue} style={{ marginTop: spacing.md }}>
            {t('service.playgrounds.common.retry')}
          </Button>
        </View>
      ) : venue ? (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.carousel}
                onLayout={(event) =>
                  setHeroWidth(event.nativeEvent.layout.width)
                }
              >
                {getVenueImages(venue).length ? (
                  getVenueImages(venue).map((uri) => (
                    <ImageBackground
                      key={uri}
                      source={{ uri }}
                      style={[
                        styles.heroImage,
                        heroWidth ? { width: heroWidth } : null,
                      ]}
                      imageStyle={styles.heroImageRadius}
                    />
                  ))
                ) : (
                  <View
                    style={[
                      styles.heroImage,
                      styles.heroFallback,
                      heroWidth ? { width: heroWidth } : null,
                      { backgroundColor: colors.surface },
                    ]}
                  />
                )}
              </ScrollView>
              <View style={styles.heroOverlay}>
                {rating !== null ? (
                  <View
                    style={[
                      styles.ratingBadge,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Star size={12} color={colors.accentOrange} />
                    <Text
                      variant="caption"
                      weight="bold"
                      style={{ marginStart: 4 }}
                    >
                      {rating.toFixed(1)}
                    </Text>
                    {ratingsCount ? (
                      <Text
                        variant="caption"
                        color={colors.textSecondary}
                        style={{ marginStart: 6 }}
                      >
                        ({ratingsCount})
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.section}>
              <Text variant="h3" weight="semibold">
                {venue.name ||
                  venue.title ||
                  t('service.playgrounds.common.playground')}
              </Text>
              <View style={styles.locationRow}>
                <MapPin size={14} color={colors.textMuted} />
                <Text
                  variant="bodySmall"
                  color={colors.textSecondary}
                  style={{ marginStart: spacing.xs }}
                >
                  {location || t('service.playgrounds.common.locationPending')}
                </Text>
              </View>
              {venue.maps_url ? (
                <Button
                  variant="secondary"
                  size="small"
                  onPress={() => Linking.openURL(venue.maps_url || '')}
                  accessibilityLabel={t(
                    'service.playgrounds.venue.actions.getDirections',
                  )}
                >
                  {t('service.playgrounds.venue.actions.getDirections')}
                </Button>
              ) : null}
              <View style={styles.chipsRow}>
                <Chip
                  label={
                    activityName || t('service.playgrounds.common.multiSport')
                  }
                />
                {priceFrom ? (
                  <Chip
                    label={`${formatMoney(priceFrom, currency)} +`}
                    selected
                  />
                ) : null}
              </View>
            </View>

            {features.length ? (
              <View style={styles.section}>
                <Text variant="bodySmall" weight="semibold">
                  {t('service.playgrounds.venue.features.title')}
                </Text>
                <View style={styles.chipsRow}>
                  {features.map((feature) => (
                    <Chip key={feature.key} label={feature.label} selected />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text variant="bodySmall" weight="semibold">
                {t('service.playgrounds.venue.academy.title')}
              </Text>
              <Text variant="bodySmall" weight="semibold">
                {academyName ||
                  t('service.playgrounds.venue.academy.defaultName')}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {academyLocation ||
                  location ||
                  t('service.playgrounds.common.locationPending')}
              </Text>
              {venue.has_special_offer ? (
                <Text variant="bodySmall" color={colors.accentOrange}>
                  {t('service.playgrounds.venue.academy.specialOffer')}
                </Text>
              ) : null}
            </View>
            <View style={styles.section}>
              <Text variant="bodySmall" weight="semibold">
                {t('service.playgrounds.venue.durations.title')}
              </Text>
              <View style={styles.chipsRow}>
                {durations.length ? (
                  durations.map((duration) => (
                    <Chip
                      key={String(
                        duration.id ?? duration.label ?? duration.minutes,
                      )}
                      label={
                        duration.label ||
                        t('service.playgrounds.booking.schedule.minutesLabel', {
                          minutes:
                            duration.minutes || duration.duration_minutes || 60,
                        })
                      }
                    />
                  ))
                ) : (
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('service.playgrounds.venue.durations.empty')}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.section}>
              <Text variant="bodySmall" weight="semibold">
                {t('service.playgrounds.venue.address.title')}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {venue.address || t('service.playgrounds.venue.address.empty')}
              </Text>
            </View>
          </ScrollView>
          <View
            style={[
              styles.stickyBar,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <View>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {priceFrom
                  ? t('service.playgrounds.venue.cta.startingAt')
                  : t('service.playgrounds.venue.cta.ready')}
              </Text>
              <Text variant="bodySmall" weight="semibold">
                {formatMoney(priceFrom, currency) ||
                  t('service.playgrounds.venue.cta.viewAvailability')}
              </Text>
            </View>
            <Button
              onPress={() => router.push(`/playgrounds/book/${venue.id}`)}
              accessibilityLabel={t(
                'service.playgrounds.venue.cta.bookAccessibility',
              )}
            >
              {t('service.playgrounds.venue.cta.book')}
            </Button>
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    paddingBottom: 140,
  },
  hero: {
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  carousel: {
    borderRadius: borderRadius.lg,
  },
  heroImage: {
    height: 240,
  },
  heroImageRadius: {
    borderRadius: borderRadius.lg,
  },
  heroFallback: {
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerIcon: {
    borderRadius: borderRadius.full,
    padding: spacing.xs,
  },
  ratingBadge: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stickyBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    ...shadows.md,
  },
});
