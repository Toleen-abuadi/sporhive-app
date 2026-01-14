// Playgrounds venue details screen with gallery, highlights, and booking CTA.
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';
import { useVenueDetails } from '../../services/playgrounds/playgrounds.hooks';
import { playgroundsStore } from '../../services/playgrounds/playgrounds.store';
import { goToBook } from '../../navigation/playgrounds.routes';

const fallbackDurations = [
  { id: '60', minutes: 60, label: '60 min' },
  { id: '90', minutes: 90, label: '90 min' },
  { id: '120', minutes: 120, label: '120 min' },
];

export function PlaygroundsVenueDetailsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const venueId = params?.venueId || params?.id || null;
  const venueParam = typeof params?.venue === 'string' ? params.venue : null;
  let venueFallback = null;
  if (venueParam) {
    try {
      venueFallback = JSON.parse(venueParam);
    } catch {
      venueFallback = null;
    }
  }
  const venue = useVenueDetails(venueId);
  const data = venue.data || venueFallback || {};
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [checkingIdentity, setCheckingIdentity] = useState(true);

  useEffect(() => {
    let mounted = true;
    playgroundsStore.getPublicUserId().then((publicUserId) => {
      if (!mounted) return;
      if (!publicUserId) {
        router.replace('/playgrounds/identify');
      }
      setCheckingIdentity(false);
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  const gallery = useMemo(() => {
    const images = [
      ...(data?.images || []),
      ...(data?.gallery || []),
      data?.image,
      data?.cover,
    ].filter(Boolean);
    return images.slice(0, 3);
  }, [data]);

  const durations = useMemo(() => {
    const raw = data?.durations || data?.duration_options || data?.session_durations || [];
    const mapped = raw.map((item, index) => ({
      id: item.id?.toString?.() || `${item.minutes || item.duration || index}`,
      minutes: item.minutes || item.duration || item.duration_minutes || 60,
      label: item.label || `${item.minutes || item.duration || 60} min`,
    }));
    return mapped.length ? mapped : fallbackDurations;
  }, [data]);

  const selected = selectedDuration || durations[0];

  if (checkingIdentity) {
    return (
      <Screen>
        <LoadingState message="Preparing venue details..." />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.hero}>
        <FlatList
          data={gallery.length ? gallery : ['placeholder']}
          horizontal
          pagingEnabled
          keyExtractor={(item, index) => `${item}-${index}`}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.heroImage}>
              {item !== 'placeholder' ? (
                <Image source={{ uri: item }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={['#0F172A', '#1F2937']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <LinearGradient
                colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.05)']}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
        />
        <View style={styles.heroContent}>
          <Text variant="h3" weight="bold" style={styles.heroTitle}>
            {data?.name || 'Skyline Arena'}
          </Text>
          <View style={styles.locationRow}>
            <MapPin size={16} color="rgba(255,255,255,0.85)" />
            <Text variant="bodySmall" style={styles.heroSubtitle}>
              {data?.location || 'Downtown Dubai · Indoor'}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <Text variant="h4" weight="bold">
          Venue highlights
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {data?.description || 'Premium turf, curated lighting, and onsite hospitality built for next-level games.'}
        </Text>
        <View style={styles.infoRow}>
          <Text variant="caption" color={colors.textMuted}>
            Court size
          </Text>
          <Text variant="bodySmall" weight="semibold">
            {data?.size || 'Premium 40m x 20m'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text variant="caption" color={colors.textMuted}>
            Players
          </Text>
          <Text variant="bodySmall" weight="semibold">
            {data?.min_players || data?.minPlayers || 4} - {data?.max_players || data?.maxPlayers || 12}
          </Text>
        </View>
        {data?.special_offer || data?.offer ? (
          <View style={[styles.offerPill, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
            <Text variant="caption" weight="bold" color={colors.accentOrange}>
              {data?.special_offer || data?.offer}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text variant="h4" weight="bold">
          Choose duration
        </Text>
        <Text variant="bodySmall" color={colors.textMuted}>
          Select how long you want the court.
        </Text>
        <View style={styles.durationRow}>
          {durations.map((duration) => {
            const active = selected?.id === duration.id;
            return (
              <Pressable
                key={duration.id}
                onPress={() => setSelectedDuration(duration)}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: active ? colors.accentOrange : colors.surface,
                    borderColor: active ? colors.accentOrange : colors.border,
                  },
                ]}
              >
                <Text variant="bodySmall" weight="bold" color={active ? colors.white : colors.textPrimary}>
                  {duration.label}
                </Text>
                <Text variant="caption" color={active ? colors.white : colors.textMuted}>
                  {data?.price ? `${data.price}` : 'From AED 120'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.ctaWrap}>
        <Button
          onPress={() =>
            goToBook(router, data?.id || venueId || '', {
              durationId: selected?.id,
              durationMinutes: selected?.minutes,
            })
          }
        >
          Book Now
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  hero: {
    height: 280,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 280,
  },
  heroContent: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.xs,
  },
  heroTitle: {
    color: '#FFFFFF',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.75)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationChip: {
    width: '47%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  ctaWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
});
