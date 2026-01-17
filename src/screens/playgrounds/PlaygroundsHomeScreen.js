// API fields used: academies slider (public_name, location_text, hero_image, tags),
// venues list (name, base_location, images, price, duration, avg_rating, ratings_count).
import { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { VenueCard } from '../../components/playgrounds/VenueCard';
import { goToMyBookings, goToSearch } from '../../navigation/playgrounds.routes';
import { useSearch, useSlider } from '../../services/playgrounds/playgrounds.hooks';

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

export const PlaygroundsHomeScreen = () => {
  const router = useRouter();
  const slider = useSlider();
  const venuesSearch = useSearch();

  const sliderItems = useMemo(() => {
    if (!slider.data || !Array.isArray(slider.data)) return [];

    return slider.data.map(item => ({
      id: item.academy_profile_id || item.academy_id || item.id || 'unknown',
      public_name: item.public_name || 'Academy',
      location_text: item.location_text || '',
      hero_image: resolveHeroImage(item.hero_image),
      tags: item.tags || [],
    })).slice(0, 5);
  }, [slider.data]);

  const featuredVenues = useMemo(() => {
    if (!venuesSearch.data || !Array.isArray(venuesSearch.data)) return [];
    return venuesSearch.data.slice(0, 3);
  }, [venuesSearch.data]);

  const renderSlider = () => {
    if (slider.loading) {
      return (
        <View style={styles.sliderContainer}>
          <View style={styles.skeletonSlider} />
        </View>
      );
    }

    if (sliderItems.length === 0) {
      return null;
    }

    return (
      <View style={styles.sliderContainer}>
        <Text style={styles.sectionTitle}>Top Academies</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sliderContent}
        >
          {sliderItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.sliderCard}>
              {item.hero_image ? (
                <Image 
                  source={{ uri: item.hero_image }} 
                  style={styles.sliderImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.sliderImage, styles.sliderImagePlaceholder]}>
                  <Text style={styles.placeholderText}>{item.public_name.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.sliderTextContainer}>
                <Text style={styles.sliderTitle} numberOfLines={1}>
                  {item.public_name}
                </Text>
                <Text style={styles.sliderLocation} numberOfLines={1}>
                  {item.location_text}
                </Text>
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {item.tags.slice(0, 2).map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#F5F8FF', '#FFFFFF']} style={styles.header}>
          <Text style={styles.title}>Discover Playgrounds</Text>
          <Text style={styles.subtitle}>Premium venues with real-time availability.</Text>
          
          <TouchableOpacity
            style={styles.searchInputContainer}
            onPress={() => goToSearch(router)}
          >
            <TextInput
              placeholder="Search by city, sport, or venue"
              style={styles.search}
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
          
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => goToSearch(router)}
            >
              <Text style={styles.primaryButtonText}>Search Venues</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => goToMyBookings(router)}
            >
              <Text style={styles.secondaryButtonText}>My Bookings</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {renderSlider()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Venues</Text>
          {featuredVenues.length ? (
            featuredVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))
          ) : (
            <Text style={styles.emptyText}>No venues available yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    paddingBottom: 24,
  },
  header: {
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#11223A',
  },
  subtitle: {
    fontSize: 14,
    color: '#6C7A92',
    marginTop: 6,
    marginBottom: 16,
  },
  searchInputContainer: {
    marginBottom: 16,
  },
  search: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E6F0',
    fontSize: 14,
    color: '#6C7A92',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4F6AD7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#EFF3FF',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4F6AD7',
    fontWeight: '600',
    fontSize: 14,
  },
  sliderContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  skeletonSlider: {
    height: 150,
    backgroundColor: '#EFF3FF',
    borderRadius: 18,
  },
  sliderContent: {
    gap: 12,
    paddingRight: 16,
  },
  sliderCard: {
    width: 200,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1A33',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  sliderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F4F7FF',
  },
  sliderImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F6AD7',
  },
  sliderTextContainer: {
    padding: 12,
  },
  sliderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11223A',
    marginBottom: 4,
  },
  sliderLocation: {
    fontSize: 12,
    color: '#6C7A92',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#FFE7CC',
  },
  tagText: {
    fontSize: 10,
    color: '#D56B00',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11223A',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#6C7A92',
  },
});
