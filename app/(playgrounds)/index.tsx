import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { TopBar } from '../../src/components/ui/TopBar';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { spacing, typography } from '../../src/theme/tokens';
import { Chip } from '../../src/components/ui/Chip';
import { Card } from '../../src/components/ui/Card';
import { IconButton } from '../../src/components/ui/IconButton';
import { TextField } from '../../src/components/ui/TextField';
import { listVenues, Venue } from '../../src/features/playgrounds/api/playgrounds.api';
import { VenuesFilterSheet } from '../../src/features/playgrounds/components/VenuesFilterSheet';
import { setVenuesCache } from '../../src/features/playgrounds/store/venuesStore';

type Filters = {
  activity_id?: string;
  date?: string;
  number_of_players: number;
  duration_id?: string;
  base_location?: string;
  academy_profile_id?: string;
  has_special_offer?: boolean;
  order_by?: 'price_asc' | 'rating_desc';
};

const DEFAULT_PLAYERS = 2;

export default function PlaygroundsExploreScreen() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'offers'>('all');
  const [filtersDraft, setFiltersDraft] = useState<Filters>({
    number_of_players: DEFAULT_PLAYERS,
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    number_of_players: DEFAULT_PLAYERS,
  });
  const [filterOpen, setFilterOpen] = useState(false);

  const activities = useMemo(
    () => [
      { id: 'all', label: 'All' },
    ],
    [],
  );

  const resolvedFilters = useMemo(() => {
    const baseFilters: Filters = {
      ...appliedFilters,
      number_of_players: appliedFilters.number_of_players ?? DEFAULT_PLAYERS,
    };
    if (activeTab === 'offers') {
      baseFilters.has_special_offer = true;
    } else {
      delete baseFilters.has_special_offer;
    }
    return baseFilters;
  }, [activeTab, appliedFilters]);

  useEffect(() => {
    let isMounted = true;
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const response = await listVenues(resolvedFilters);
        if (isMounted) {
          setVenues(response);
          setVenuesCache(response);
        }
      } catch (error) {
        if (isMounted) {
          setVenues([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void fetchVenues();
    return () => {
      isMounted = false;
    };
  }, [resolvedFilters]);

  const handleApplyFilters = (nextFilters: Filters) => {
    setAppliedFilters(nextFilters);
    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    const reset = { number_of_players: DEFAULT_PLAYERS } satisfies Filters;
    setFiltersDraft(reset);
    setAppliedFilters(reset);
  };

  return (
    <Screen>
      <TopBar
        title="Playgrounds"
        actions={<IconButton icon="sliders" onPress={() => setFilterOpen(true)} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Where do you want to play?</Text>
          <Card style={styles.searchInput}>
            <TextField
              placeholder="Search by location"
              value={filtersDraft.base_location ?? ''}
              onChangeText={(value) => {
                setFiltersDraft((prev) => ({ ...prev, base_location: value }));
                setAppliedFilters((prev) => ({ ...prev, base_location: value }));
              }}
            />
          </Card>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {activities.map((activity) => (
            <Chip
              key={activity.id}
              label={activity.label}
              selected={filtersDraft.activity_id === activity.id || activity.id === 'all'}
              onPress={() =>
                setFiltersDraft((prev) => ({
                  ...prev,
                  activity_id: activity.id === 'all' ? undefined : activity.id,
                }))
              }
              style={styles.chip}
            />
          ))}
        </ScrollView>

        <View style={styles.tabsRow}>
          <Chip
            label="All"
            selected={activeTab === 'all'}
            onPress={() => setActiveTab('all')}
            style={styles.tabChip}
          />
          <Chip
            label="Offers"
            selected={activeTab === 'offers'}
            onPress={() => setActiveTab('offers')}
            style={styles.tabChip}
          />
        </View>

        <Text style={styles.sectionTitle}>Recommended</Text>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator />
          </View>
        ) : (
          <View style={styles.list}>
            {venues.map((venue) => {
              const imageSource = venue.image || venue.academy_profile?.hero_image;
              return (
                <Card key={venue.id} style={styles.card}>
                  <Pressable
                    onPress={() => {
                      router.push(`/(playgrounds)/venue/${venue.id}`);
                    }}
                  >
                    <View style={styles.imageWrapper}>
                      {imageSource ? (
                        <Image source={{ uri: imageSource }} style={styles.image} />
                      ) : (
                        <View style={styles.imageFallback} />
                      )}
                      <View style={styles.imageOverlay}>
                        <Text style={styles.cardTitle}>{venue.name}</Text>
                        <View style={styles.ratingChip}>
                          <Text style={styles.ratingText}>
                            {venue.avg_rating ?? '--'} ★ ({venue.ratings_count ?? 0})
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>

                  <Text style={styles.locationText}>
                    {venue.academy_profile?.location_text || venue.base_location || 'Location TBD'}
                  </Text>

                  {venue.has_special_offer ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Special offer</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.priceText}>
                      {venue.price ? `From ${venue.price}` : 'From —'}
                    </Text>
                    <PrimaryButton
                      label="Book now"
                      onPress={() => router.push(`/(playgrounds)/book/${venue.id}`)}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <VenuesFilterSheet
        visible={filterOpen}
        filters={filtersDraft}
        onChange={setFiltersDraft}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onClose={() => setFilterOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  searchCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  searchLabel: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
  },
  searchInput: {
    padding: spacing.sm,
  },
  chipsRow: {
    gap: spacing.sm,
  },
  chip: {
    marginRight: spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabChip: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '600',
  },
  loadingState: {
    paddingVertical: spacing.xl,
  },
  list: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  imageWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  imageFallback: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  ratingText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: '600',
    color: '#0F172A',
  },
  locationText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: '#475569',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#FFE8D6',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: '#EA580C',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  priceText: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
  },
});
