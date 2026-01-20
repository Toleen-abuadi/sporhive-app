import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Share2, Star } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { IconButton } from '../../components/ui/IconButton';
import { BackButton } from '../../components/ui/BackButton';
import { endpoints } from '../../services/api/endpoints';
import { API_BASE_URL } from '../../services/api/client';
import { getPlaygroundsClientState } from '../../services/playgrounds/storage';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

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
  bibs: 'Bibs provided',
  water: 'Water available',
  toilets: 'Toilets',
  toilet: 'Toilets',
  parking: 'Parking',
  ac: 'Air conditioned',
  indoor: 'Indoor',
};

function normalizeFeatureTags(venue) {
  const collect = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.split(',').map((item) => item.trim());
  };
  const tags = [...collect(venue.tags), ...collect(venue.features), ...collect(venue.amenities)];
  return tags.map((tag) => tag.toLowerCase()).filter(Boolean);
}

function mapVenueFeatures(venue) {
  const tags = normalizeFeatureTags(venue);
  const mapped = Object.keys(FEATURE_LABELS).filter((key) => tags.includes(key));
  return mapped.map((key) => ({ key, label: FEATURE_LABELS[key] }));
}

function formatMoney(amount, currency) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${Number(amount).toFixed(0)}`;
}

export function VenueDetailsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();
  const [heroWidth, setHeroWidth] = useState(0);

  const [venue, setVenue] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activityMap = useMemo(() => {
    return new Map(activities.map((activity) => [String(activity.id), activity.name || '']));
  }, [activities]);

  const loadVenue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const client = await getPlaygroundsClientState();
      const cached = Array.isArray(client?.cachedResults) ? client?.cachedResults : [];
      const fromCache = cached.find((item) => String(item.id) === String(venueId));
      if (fromCache) {
        setVenue(fromCache);
      } else {
        const res = await endpoints.playgrounds.venuesList({ number_of_players: 2 });
        const list = Array.isArray(res?.venues)
          ? res.venues
          : Array.isArray(res?.data?.venues)
          ? res.data.venues
          : Array.isArray(res?.data)
          ? res.data
          : [];
        const match = list.find((item) => String(item.id) === String(venueId));
        if (match) {
          setVenue(match);
        } else {
          setError('Venue not found.');
        }
      }

      const activitiesRes = await endpoints.playgrounds.activitiesList({ include_inactive: false });
      const activitiesList = Array.isArray(activitiesRes?.activities)
        ? activitiesRes.activities
        : Array.isArray(activitiesRes?.data?.activities)
        ? activitiesRes.data.activities
        : Array.isArray(activitiesRes?.data)
        ? activitiesRes.data
        : [];
      setActivities(activitiesList);
    } catch (err) {
      setError(err?.message || 'Unable to load venue.');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    loadVenue();
  }, [loadVenue]);

  const location = venue ? [venue.city, venue.country].filter(Boolean).join(', ') : '';
  const ratingRaw = venue?.rating ?? venue?.avg_rating ?? null;
  const rating = ratingRaw !== null && ratingRaw !== undefined ? Number(ratingRaw) : null;
  const ratingsCount = venue?.ratings_count;
  const durations = venue?.durations || venue?.venue_durations || [];
  const slots = venue?.slots || venue?.available_slots || [];
  const currency = venue?.currency || durations?.[0]?.currency || slots?.[0]?.currency || null;
  const priceFrom =
    venue?.price_from ??
    venue?.starting_price ??
    durations?.[0]?.price ??
    slots?.[0]?.price ??
    null;
  const activityName = venue?.activity_id ? activityMap.get(String(venue?.activity_id)) : null;
  const features = venue ? mapVenueFeatures(venue) : [];
  const academyName = venue?.academy_profile?.name || venue?.academy_profile?.title;
  const academyLocation = venue?.academy_profile?.city || venue?.academy_profile?.country || venue?.location_text;

  return (
    <Screen safe>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accentOrange} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text variant="body" color={colors.textSecondary}>
            {error}
          </Text>
          <Button onPress={loadVenue} style={{ marginTop: spacing.md }}>
            Retry
          </Button>
        </View>
      ) : venue ? (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.carousel}
                onLayout={(event) => setHeroWidth(event.nativeEvent.layout.width)}
              >
                {getVenueImages(venue).length ? (
                  getVenueImages(venue).map((uri) => (
                    <ImageBackground
                      key={uri}
                      source={{ uri }}
                      style={[styles.heroImage, heroWidth ? { width: heroWidth } : null]}
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
                <View style={styles.heroActions}>
                  <BackButton
                    color={colors.textPrimary}
                    style={[styles.heroIcon, { backgroundColor: colors.surface }]}
                  />
                  <IconButton
                    icon={() => <Share2 size={18} color={colors.textPrimary} />}
                    onPress={() => {}}
                    accessibilityLabel="Share venue"
                    style={[styles.heroIcon, { backgroundColor: colors.surface }]}
                  />
                </View>
                {rating !== null ? (
                  <View style={[styles.ratingBadge, { backgroundColor: colors.surface }]}>
                    <Star size={12} color={colors.accentOrange} />
                    <Text variant="caption" weight="bold" style={{ marginLeft: 4 }}>
                      {rating.toFixed(1)}
                    </Text>
                    {ratingsCount ? (
                      <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 6 }}>
                        ({ratingsCount})
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.section}>
              <Text variant="h3" weight="semibold">
                {venue.name || venue.title || 'Playground'}
              </Text>
              <View style={styles.locationRow}>
                <MapPin size={14} color={colors.textMuted} />
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginLeft: spacing.xs }}>
                  {location || 'Location pending'}
                </Text>
              </View>
              {venue.maps_url ? (
                <Button
                  variant="secondary"
                  size="small"
                  onPress={() => Linking.openURL(venue.maps_url || '')}
                  accessibilityLabel="Get directions"
                >
                  Get directions
                </Button>
              ) : null}
              <View style={styles.chipsRow}>
                <Chip label={activityName || 'Multi-sport'} />
                {priceFrom ? <Chip label={`${formatMoney(priceFrom, currency)} +`} selected /> : null}
              </View>
            </View>

            {features.length ? (
              <View style={styles.section}>
                <Text variant="bodySmall" weight="semibold">
                  Features
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
                Academy
              </Text>
              <Text variant="bodySmall" weight="semibold">
                {academyName || 'SporHive Academy'}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {academyLocation || location || 'Location pending'}
              </Text>
              {venue.has_special_offer ? (
                <Text variant="bodySmall" color={colors.accentOrange}>
                  Special offers available for this venue.
                </Text>
              ) : null}
            </View>
            <View style={styles.section}>
              <Text variant="bodySmall" weight="semibold">
                Available durations
              </Text>
              <View style={styles.chipsRow}>
                {durations.length ? (
                  durations.map((duration) => (
                    <Chip
                      key={String(duration.id ?? duration.label ?? duration.minutes)}
                      label={duration.label || `${duration.minutes || duration.duration_minutes || 60} min`}
                    />
                  ))
                ) : (
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    Ask the venue for available durations.
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.section}>
              <Text variant="bodySmall" weight="semibold">
                Address
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {venue.address || 'Details available at booking.'}
              </Text>
            </View>
          </ScrollView>
          <View style={[styles.stickyBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {priceFrom ? 'Starting at' : 'Ready to book?'}
              </Text>
              <Text variant="bodySmall" weight="semibold">
                {formatMoney(priceFrom, currency) || 'View availability'}
              </Text>
            </View>
            <Button onPress={() => router.push(`/playgrounds/book/${venue.id}`)} accessibilityLabel="Book this venue">
              Book now
            </Button>
          </View>
        </>
      ) : null}
    </Screen>
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
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroIcon: {
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
