// API fields used: academies slider (public_name, location_text, hero_image, tags),
// venues list (name, base_location, images, price, duration, avg_rating, ratings_count).
import { useMemo } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CategoryPillsRow } from '../../components/playgrounds/CategoryPillsRow';
import { PlaygroundsHeader } from '../../components/playgrounds/PlaygroundsHeader';
import { SectionSkeleton, VenueCardSkeleton } from '../../components/playgrounds/Skeletons';
import { VenueCard } from '../../components/playgrounds/VenueCard';
import { goToMyBookings, goToSearch, goToVenue } from '../../navigation/playgrounds.routes';
import { useSearch, useSlider } from '../../services/playgrounds/playgrounds.hooks';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

const resolveHeroImage = (heroImage) => {
  if (!heroImage) return null;
  if (heroImage.startsWith?.('data:image')) return heroImage;
  const trimmed = heroImage.trim();
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed);
  if (!isBase64) return heroImage;
  let mime = 'image/jpeg';
  if (trimmed.startsWith('iVBOR')) mime = 'image/png';
  if (trimmed.startsWith('R0lGOD')) mime = 'image/gif';
  if (trimmed.startsWith('UklGR')) mime = 'image/webp';
  return `data:${mime};base64,${trimmed}`;
};

const getActivityOptions = (venues = []) => {
  const map = new Map();
  venues.forEach((venue) => {
    const value =
      venue?.activity_id ||
      venue?.activity?.id ||
      venue?.activity?.name ||
      venue?.activity_name;
    const label = venue?.activity?.name || venue?.activity_name || 'Activity';
    if (value && !map.has(String(value))) {
      map.set(String(value), { value, label });
    }
  });
  return Array.from(map.values());
};

export const PlaygroundsHomeScreen = () => {
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);
  const slider = useSlider();
  const venuesSearch = useSearch();

  const sliderItems = useMemo(() => {
    if (!slider.data || !Array.isArray(slider.data)) return [];

    return slider.data
      .map((item) => ({
        id: item.academy_profile_id || item.academy_id || item.id || 'unknown',
        public_name: item.public_name || 'Academy',
        location_text: item.location_text || '',
        hero_image: resolveHeroImage(item.hero_image),
        tags: item.tags || [],
      }))
      .slice(0, 5);
  }, [slider.data]);

  const featuredVenues = useMemo(() => {
    if (!venuesSearch.data || !Array.isArray(venuesSearch.data)) return [];
    return venuesSearch.data.slice(0, 6);
  }, [venuesSearch.data]);

  const activityOptions = useMemo(
    () => getActivityOptions(venuesSearch.data || []),
    [venuesSearch.data],
  );

  const renderSliderItem = ({ item }) => (
    <TouchableOpacity style={styles.sliderCard} activeOpacity={0.88}>
      {item.hero_image ? (
        <Image source={{ uri: item.hero_image }} style={styles.sliderImage} />
      ) : (
        <View style={[styles.sliderImage, { backgroundColor: theme.colors.surface }]} />
      )}
      <LinearGradient colors={['transparent', theme.colors.overlay]} style={styles.sliderGradient} />
      <View style={styles.sliderMeta}>
        <Text style={[styles.sliderTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
          {item.public_name}
        </Text>
        <Text style={[styles.sliderLocation, { color: '#FFFFFF' }]} numberOfLines={1}>
          {item.location_text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={featuredVenues}
        keyExtractor={(item) => String(item.id || item.name)}
        ListHeaderComponent={(
          <>
            <PlaygroundsHeader
              title="Book premium playgrounds"
              subtitle="Find verified academies and real-time availability."
              rightLabel="Bookings"
              onRightPress={() => goToMyBookings(router)}
            />
            <TouchableOpacity
              style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => goToSearch(router)}
            >
              <TextInput
                placeholder="Search city, sport, or venue"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                editable={false}
                pointerEvents="none"
              />
            </TouchableOpacity>
            <CategoryPillsRow
              categories={activityOptions}
              onSelect={() => goToSearch(router)}
            />
            {slider.loading ? (
              <View style={{ paddingVertical: 12 }}>
                <SectionSkeleton />
              </View>
            ) : sliderItems.length ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Top Academies</Text>
                </View>
                <FlatList
                  horizontal
                  data={sliderItems}
                  keyExtractor={(item) => String(item.id)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sliderRow}
                  renderItem={renderSliderItem}
                />
              </View>
            ) : null}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recommended venues</Text>
              <TouchableOpacity onPress={() => goToSearch(router)}>
                <Text style={[styles.sectionAction, { color: theme.colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        renderItem={({ item }) => (
          <VenueCard venue={item} onPress={() => goToVenue(router, item.id)} />
        )}
        ListEmptyComponent={
          venuesSearch.loading ? (
            <>
              <VenueCardSkeleton />
              <VenueCardSkeleton />
            </>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No venues yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                We are onboarding premium academies in your area.
              </Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  searchBar: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: {
    fontSize: 14,
  },
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    marginTop: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '600',
  },
  sliderRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  sliderCard: {
    width: 220,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sliderImage: {
    width: '100%',
    height: '100%',
  },
  sliderGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
  },
  sliderMeta: {
    position: 'absolute',
    left: 12,
    bottom: 12,
  },
  sliderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sliderLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  emptyState: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
    marginTop: 6,
  },
});
