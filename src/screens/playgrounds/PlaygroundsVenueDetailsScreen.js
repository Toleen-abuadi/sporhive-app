// API fields used: name, base_location, pitch_size, area_size, min_players, max_players,
// avg_rating, ratings_count, price, duration, images, has_special_offer, special_offer_note,
// academy_profile.public_name, academy_profile.location_text, academy_profile.tags.
import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SlotGrid } from '../../components/playgrounds/SlotGrid';
import { goToBook } from '../../navigation/playgrounds.routes';
import { useVenue } from '../../services/playgrounds/playgrounds.hooks';

const { width } = Dimensions.get('window');

const resolveImageUri = (image) => {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (image?.url) return image.url;
  if (image?.uri) return image.uri;
  return null;
};

const buildGallery = (images = []) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => resolveImageUri(img))
    .filter(Boolean);
};

const resolvePrice = (venue) => {
  if (venue?.price != null && venue?.price !== '') return venue.price;
  const duration = Array.isArray(venue?.duration) ? venue.duration : [];
  return duration[0]?.base_price ?? null;
};

export const PlaygroundsVenueDetailsScreen = () => {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const { data, loading, error } = useVenue(venueId);
  const [selectedDuration, setSelectedDuration] = useState(null);

  const venue = useMemo(() => data || {}, [data]);
  const gallery = useMemo(() => buildGallery(venue?.images), [venue?.images]);
  const durations = useMemo(() => (
    Array.isArray(venue?.duration) ? venue.duration : []
  ), [venue?.duration]);

  const effectiveDuration = selectedDuration || durations[0] || null;

  const renderGallery = () => {
    if (!gallery.length) {
      return (
        <View style={styles.galleryPlaceholder}>
          <Text style={styles.placeholderText}>No images available</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={gallery}
        keyExtractor={(item, index) => `${item}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.galleryCard}>
            <Image 
              source={{ uri: item }} 
              style={styles.galleryImage}
              resizeMode="cover"
            />
          </View>
        )}
        style={styles.galleryList}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text>Loading venue details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load venue details</Text>
        </View>
      </SafeAreaView>
    );
  }

  const priceValue = resolvePrice(venue);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderGallery()}

        <LinearGradient colors={['#F4F7FF', '#FFFFFF']} style={styles.hero}>
          <Text style={styles.title}>{venue?.name || 'Venue'}</Text>
          <Text style={styles.subtitle}>{venue?.base_location || venue?.academy_profile?.location_text || 'N/A'}</Text>
          {venue?.academy_profile?.public_name ? (
            <Text style={styles.meta}>Academy: {venue.academy_profile.public_name}</Text>
          ) : null}
          {venue?.has_special_offer && venue?.special_offer_note ? (
            <View style={styles.offerPill}>
              <Text style={styles.offerText}>{venue.special_offer_note}</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Pitch Size</Text>
            <Text style={styles.infoValue}>{venue?.pitch_size || 'N/A'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Area Size</Text>
            <Text style={styles.infoValue}>{venue?.area_size || 'N/A'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Players</Text>
            <Text style={styles.infoValue}>
              {venue?.min_players ?? 'N/A'} - {venue?.max_players ?? 'N/A'}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Rating</Text>
            <Text style={styles.infoValue}>
              {venue?.avg_rating ?? 'N/A'} ({venue?.ratings_count ?? 0})
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Price</Text>
            <Text style={styles.infoValue}>
              {priceValue != null ? `${priceValue} JOD` : 'N/A'}
            </Text>
          </View>
        </View>

        {durations.length ? (
          <>
            <Text style={styles.sectionTitle}>Choose Duration</Text>
            <View style={styles.durationRow}>
              {durations.map((duration) => {
                const isSelected = effectiveDuration?.id === duration.id;
                return (
                  <TouchableOpacity
                    key={duration.id}
                    style={[styles.durationChip, isSelected && styles.durationChipActive]}
                    onPress={() => setSelectedDuration(duration)}
                  >
                    <Text style={[styles.durationText, isSelected && styles.durationTextActive]}>
                      {duration?.minutes ? `${duration.minutes} min` : 'Duration'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Available Slots</Text>
        <SlotGrid
          slots={[]}
          selectedSlotId={null}
          onSelect={(slot) => console.log('Selected slot:', slot)}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={() => goToBook(router, venue?.id || venueId)}
        >
          <Text style={styles.buttonText}>Book Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#D64545',
    fontSize: 16,
  },
  content: {
    paddingBottom: 24,
  },
  galleryList: {
    height: 240,
  },
  galleryCard: {
    width,
    height: 240,
    paddingHorizontal: 12,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  galleryPlaceholder: {
    width,
    height: 240,
    backgroundColor: '#F4F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    marginHorizontal: 12,
  },
  placeholderText: {
    color: '#6C7A92',
    fontSize: 14,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1A33',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11223A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6C7A92',
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: '#6C7A92',
  },
  offerPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFE7CC',
  },
  offerText: {
    color: '#D56B00',
    fontWeight: '700',
    fontSize: 11,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  infoCard: {
    flexBasis: '48%',
    backgroundColor: '#F7F9FF',
    padding: 12,
    borderRadius: 16,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6C7A92',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11223A',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F4FA',
  },
  durationChipActive: {
    backgroundColor: '#4F6AD7',
  },
  durationText: {
    fontSize: 12,
    color: '#6C7A92',
    fontWeight: '600',
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  button: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#4F6AD7',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
