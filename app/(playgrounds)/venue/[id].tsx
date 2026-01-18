import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../src/components/ui/Screen';
import { TopBar } from '../../../src/components/ui/TopBar';
import { PrimaryButton, StickyCTA } from '../../../src/components/ui/PrimaryButton';
import { spacing, typography } from '../../../src/theme/tokens';
import { Chip } from '../../../src/components/ui/Chip';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { listVenues, Venue } from '../../../src/features/playgrounds/api/playgrounds.api';
import { getVenueById, setVenuesCache } from '../../../src/features/playgrounds/store/venuesStore';
import { formatJodPrice, getErrorMessage, isNetworkError, resolveImageSource } from '../../../src/features/playgrounds/utils';

const DEFAULT_PLAYERS = 2;

export default function VenueDetailsModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const venueId = Array.isArray(id) ? id[0] : id;
  const { width } = useWindowDimensions();
  const [venue, setVenue] = useState<Venue | null>(() =>
    venueId ? getVenueById(venueId) : null,
  );
  const [loading, setLoading] = useState(!venue);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!venueId || venue) return;
    let isMounted = true;
    const fetchVenue = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await listVenues({ number_of_players: DEFAULT_PLAYERS });
        if (!isMounted) return;
        setVenuesCache(response);
        const match = response.find((item) => item.id === venueId) ?? null;
        setVenue(match);
      } catch (error) {
        if (!isMounted) return;
        if (isNetworkError(error)) {
          setErrorMessage(getErrorMessage(error, 'Network error. Please try again.'));
        } else {
          setErrorMessage(getErrorMessage(error, 'Unable to load venue details.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void fetchVenue();
    return () => {
      isMounted = false;
    };
  }, [venue, venueId, retryKey]);

  const images = useMemo(() => {
    if (!venue) return [];
    if (venue.images && venue.images.length > 0) return venue.images;
    if (venue.academy_profile?.hero_image) return [venue.academy_profile.hero_image];
    if (venue.image) return [venue.image];
    return [];
  }, [venue]);

  const handleBook = useCallback(() => {
    if (venueId) {
      router.push(`/(playgrounds)/book/${venueId}`);
    }
  }, [venueId, router]);

  if (loading) {
    return (
      <Screen>
        <TopBar title="Venue details" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <Skeleton height={260} radius={0} />
          <View style={styles.skeletonContent}>
            <Skeleton height={26} width="70%" />
            <Skeleton height={16} width="45%" />
            <Skeleton height={44} width={160} radius={16} />
          </View>
          <View style={styles.skeletonSection}>
            <Skeleton height={18} width="30%" />
            <View style={styles.skeletonChips}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`chip-${index}`} height={36} width={110} radius={999} />
              ))}
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen>
        <TopBar title="Venue details" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.subtitle}>Unable to load venue.</Text>
          <Text style={styles.helperText}>{errorMessage}</Text>
          <PrimaryButton label="Retry" onPress={() => setRetryKey((prev) => prev + 1)} />
        </View>
      </Screen>
    );
  }

  if (!venue) {
    return (
      <Screen>
        <TopBar title="Venue details" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.subtitle}>Venue not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Venue details" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            {images.length > 0 ? (
              images.map((image, index) => (
                <Image
                  key={`${image}-${index}`}
                  source={resolveImageSource(image) ?? undefined}
                  style={[styles.heroImage, { width }]}
                />
              ))
            ) : (
              <View style={[styles.heroFallback, { width }]} />
            )}
          </ScrollView>
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>
              {venue.avg_rating ?? '--'} ★ ({venue.ratings_count ?? 0})
            </Text>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{venue.name}</Text>
          <Text style={styles.location}>
            {venue.academy_profile?.location_text || venue.base_location || 'Location TBD'}
          </Text>
          {venue.academy_profile?.maps_url ? (
            <PrimaryButton
              label="Get Directions"
              onPress={() => Linking.openURL(venue.academy_profile?.maps_url ?? '')}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.chipGrid}>
            {venue.min_players && venue.max_players ? (
              <Chip label={`${venue.min_players}-${venue.max_players} players`} />
            ) : (
              <Chip label="Players TBD" />
            )}
            {venue.pitch_size ? <Chip label={venue.pitch_size} /> : null}
            {venue.area_size ? <Chip label={venue.area_size} /> : null}
            {(venue.academy_profile?.tags ?? []).map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
            {venue.has_special_offer ? (
              <Chip label={venue.special_offer_note || 'Special offer'} selected />
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <View style={styles.chipGrid}>
            <Chip label="Football" selected />
            <Chip label="Training" />
            <Chip label="Pickup games" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <View style={styles.calendarCard}>
            <Text style={styles.calendarTitle}>Check available slots</Text>
            <Text style={styles.calendarSubtitle}>Choose a date to see open times.</Text>
          </View>
        </View>
      </ScrollView>

      <StickyCTA
        label="Book now"
        priceLabel="From"
        priceValue={formatJodPrice(venue.price)}
        onPress={handleBook}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing['2xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  skeletonContent: {
    padding: spacing.lg,
    width: '100%',
    gap: spacing.sm,
  },
  skeletonSection: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  skeletonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hero: {
    position: 'relative',
  },
  heroImage: {
    height: 260,
  },
  heroFallback: {
    height: 260,
    backgroundColor: '#E2E8F0',
  },
  ratingPill: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  ratingText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '600',
  },
  header: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    fontWeight: '700',
  },
  location: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: '#475569',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
  },
  calendarTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
  },
  calendarSubtitle: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: '#64748B',
  },
  subtitle: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  helperText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: '#64748B',
  },
});
