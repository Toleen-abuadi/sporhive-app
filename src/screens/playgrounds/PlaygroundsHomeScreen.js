import { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AcademySlider } from '../../components/playgrounds/AcademySlider';
import { VenueCard } from '../../components/playgrounds/VenueCard';
import { goToMyBookings, goToSearch } from '../../navigation/playgrounds.routes';
import { useSlider } from '../../services/playgrounds/playgrounds.hooks';

const featuredVenues = [
  { id: '1', name: 'Skyline Arena', city: 'Amman', sport: 'Football', rating: '4.9', price: '18 JOD / hr' },
  { id: '2', name: 'Luna Courts', city: 'Zarqa', sport: 'Padel', rating: '4.7', price: '22 JOD / hr' },
];

export const PlaygroundsHomeScreen = () => {
  const router = useRouter();
  const slider = useSlider();
  const sliderItems = useMemo(() => slider.data || [], [slider.data]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient colors={['#F5F8FF', '#FFFFFF']} style={styles.header}>
          <Text style={styles.title}>Discover Playgrounds</Text>
          <Text style={styles.subtitle}>Premium venues with real-time availability.</Text>
          <TextInput
            placeholder="Search by city, sport, or venue"
            style={styles.search}
          />
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

        <AcademySlider items={sliderItems.length ? sliderItems : undefined} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured</Text>
          {featuredVenues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
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
  },
  search: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E6F0',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11223A',
    marginBottom: 12,
  },
});
