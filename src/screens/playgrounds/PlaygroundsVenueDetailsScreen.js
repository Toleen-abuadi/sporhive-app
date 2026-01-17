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

const durations = [
  { id: '60', minutes: 60, label: '60 min' },
  { id: '90', minutes: 90, label: '90 min' },
  { id: '120', minutes: 120, label: '120 min' },
];

export const PlaygroundsVenueDetailsScreen = () => {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const { data, loading, error } = useVenue(venueId);
  const [selectedDuration, setSelectedDuration] = useState(durations[0]);

  const venue = useMemo(() => {
    if (!data) return {};
    
    return {
      id: data.id || venueId,
      name: data.name || 'Skyline Arena',
      city: data.city || 'Amman',
      sport: data.sport || 'Football',
      description: data.description || 'Premium sports venue with excellent facilities.',
      price_per_hour: data.price_per_hour || 15,
      size: data.size || '5v5',
      min_players: data.min_players || 6,
      max_players: data.max_players || 14,
      location: data.location || 'Abdoun',
      has_special_offer: data.has_special_offer || false,
      offer: data.special_offer_note || '10% off on weekends',
      image: data.image,
      gallery: data.gallery || [
        data.image,
        'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80',
      ],
      slots: data.slots || [
        { id: '1', label: '6:00 PM', time: '18:00' },
        { id: '2', label: '7:00 PM', time: '19:00' },
        { id: '3', label: '8:00 PM', time: '20:00' },
        { id: '4', label: '9:00 PM', time: '21:00' },
      ],
    };
  }, [data, venueId]);

  const renderGallery = () => {
    if (!venue.gallery || venue.gallery.length === 0) {
      return (
        <View style={styles.galleryPlaceholder}>
          <Text style={styles.placeholderText}>No images available</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={venue.gallery}
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderGallery()}

        <LinearGradient colors={['#F4F7FF', '#FFFFFF']} style={styles.hero}>
          <Text style={styles.title}>{venue.name}</Text>
          <Text style={styles.subtitle}>{venue.city} · {venue.sport}</Text>
          <Text style={styles.meta}>{venue.description}</Text>
          
          {venue.has_special_offer && venue.offer && (
            <View style={styles.offerPill}>
              <Text style={styles.offerText}>{venue.offer}</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Size</Text>
            <Text style={styles.infoValue}>{venue.size}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Players</Text>
            <Text style={styles.infoValue}>
              {venue.min_players} - {venue.max_players}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Price</Text>
            <Text style={styles.infoValue}>{venue.price_per_hour} JOD/hr</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Choose Duration</Text>
        <View style={styles.durationRow}>
          {durations.map((duration) => {
            const isSelected = selectedDuration?.id === duration.id;
            return (
              <TouchableOpacity
                key={duration.id}
                style={[styles.durationChip, isSelected && styles.durationChipActive]}
                onPress={() => setSelectedDuration(duration)}
              >
                <Text style={[styles.durationText, isSelected && styles.durationTextActive]}>
                  {duration.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Available Slots</Text>
        <SlotGrid
          slots={venue.slots}
          selectedSlotId={null}
          onSelect={(slot) => console.log('Selected slot:', slot)}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={() => goToBook(router, venue.id || venueId)}
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
    marginBottom: 12,
  },
  meta: {
    fontSize: 12,
    color: '#7A8BA8',
    lineHeight: 18,
  },
  offerPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#E6F5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  offerText: {
    fontSize: 12,
    color: '#2E6BA6',
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F4F7FF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6C7A92',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#11223A',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EFF3FF',
  },
  durationChipActive: {
    backgroundColor: '#4F6AD7',
  },
  durationText: {
    fontSize: 12,
    color: '#4F6AD7',
    fontWeight: '600',
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  button: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: '#4F6AD7',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});