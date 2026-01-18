import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Star } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { endpoints } from '../../services/api/endpoints';
import { API_BASE_URL } from '../../services/api/client';
import { getPlaygroundsClientState } from '../../services/playgrounds/storage';
import { Activity, Venue } from '../../services/playgrounds/types';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

function getVenueImages(venue: Venue): string[] {
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

function resolveVenueImage(venue: Venue): string | null {
  const images = getVenueImages(venue);
  return images[0] || null;
}

function formatMoney(amount?: number | null, currency?: string | null) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${Number(amount).toFixed(0)}`;
}

export function VenueDetailsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
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
      const cached = Array.isArray(client?.cachedResults) ? (client?.cachedResults as Venue[]) : [];
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

  const imageUrl = venue ? resolveVenueImage(venue) : null;
  const location = venue ? [venue.city, venue.country].filter(Boolean).join(', ') : '';
  const ratingRaw = venue?.rating ?? venue?.avg_rating ?? null;
  const rating = ratingRaw !== null && ratingRaw !== undefined ? Number(ratingRaw) : null;
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

  return (
    <Screen safe>
      <AppHeader title="Venue details" />
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
              {imageUrl ? (
                <ImageBackground source={{ uri: imageUrl }} style={styles.heroImage} imageStyle={styles.heroImageRadius} />
              ) : (
                <View style={[styles.heroImage, styles.heroFallback, { backgroundColor: colors.surface }]} />
              )}
              {rating !== null ? (
                <View style={[styles.ratingBadge, { backgroundColor: colors.surface }]}>
                  <Star size={12} color={colors.accentOrange} />
                  <Text variant="caption" weight="bold" style={{ marginLeft: 4 }}>
                    {rating.toFixed(1)}
                  </Text>
                </View>
              ) : null}
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
              <View style={styles.chipsRow}>
                <Chip label={activityName || 'Multi-sport'} />
                {priceFrom ? <Chip label={`${formatMoney(priceFrom, currency)} +`} selected /> : null}
              </View>
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
  heroImage: {
    height: 220,
  },
  heroImageRadius: {
    borderRadius: borderRadius.lg,
  },
  heroFallback: {
    justifyContent: 'center',
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
