import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Ticket } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { AcademySlider } from '../../components/playgrounds/AcademySlider';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { normalizeSliderItems } from '../../services/playgrounds/playgrounds.normalize';
import { LoadingState } from '../../components/ui/LoadingState';
import { usePlaygroundsRouter } from '../../navigation/playgrounds.routes';

export function PlaygroundsHomeScreen() {
  const { colors } = useTheme();
  const { goToSearch, goToMyBookings, goToVenue } = usePlaygroundsRouter();
  const [sliderItems, setSliderItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    playgroundsApi.fetchSlider().then((res) => {
      if (!isMounted) return;
      if (res?.success) {
        setSliderItems(normalizeSliderItems(res.data));
      }
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const heroGradient = useMemo(
    () => ['rgba(249,115,22,0.15)', 'rgba(14,116,144,0.05)'],
    []
  );

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.hero}>
        <LinearGradient colors={heroGradient} style={StyleSheet.absoluteFill} />
        <View style={styles.heroContent}>
          <Text variant="h2" weight="bold">
            Book next-level courts
          </Text>
          <Text variant="body" color={colors.textSecondary}>
            Premium playgrounds, handpicked times, and instant booking.
          </Text>
          <View style={styles.heroButtons}>
            <Button onPress={() => goToSearch()} style={styles.heroButton}>
              Search
            </Button>
            <Button
              onPress={() => goToMyBookings()}
              variant="secondary"
              style={styles.heroButton}
            >
              My bookings
            </Button>
          </View>
        </View>
        <View style={styles.heroBadges}>
          <View style={[styles.heroBadge, { backgroundColor: colors.surface }]}>
            <Search size={16} color={colors.accentOrange} />
            <Text variant="caption" weight="semibold">
              Smart search
            </Text>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: colors.surface }]}>
            <Ticket size={16} color={colors.accentOrange} />
            <Text variant="caption" weight="semibold">
              Instant booking
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="h4" weight="bold">
          Featured experiences
        </Text>
        <Text variant="bodySmall" color={colors.textMuted}>
          Trending across padel, football, and racket sports.
        </Text>
      </View>

      {loading ? (
        <LoadingState message="Loading curated highlights..." />
      ) : (
        <AcademySlider
          items={sliderItems}
          onPress={(item) => goToVenue(item?.id, { venue: JSON.stringify(item) })}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  hero: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: 24,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  heroContent: {
    gap: spacing.sm,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroButton: {
    flex: 1,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
});
