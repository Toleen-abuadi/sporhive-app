import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SlotGrid } from '../../components/playgrounds/SlotGrid';
import { goToBook } from '../../navigation/playgrounds.routes';
import { useVenue } from '../../services/playgrounds/playgrounds.hooks';

const { width } = Dimensions.get('window');

const defaultGallery = [
  'https://images.unsplash.com/photo-1508606572321-901ea443707f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80',
];

const durations = [
  { id: '60', minutes: 60, label: '60 min' },
  { id: '90', minutes: 90, label: '90 min' },
  { id: '120', minutes: 120, label: '120 min' },
];

const GalleryImage = ({ uri, index, scrollX }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(scrollX.value, inputRange, [0.92, 1, 0.92], Extrapolate.CLAMP);
    return {
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.galleryCard, animatedStyle]}>
      <Animated.Image source={{ uri }} style={styles.galleryImage} />
    </Animated.View>
  );
};

export const PlaygroundsVenueDetailsScreen = () => {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const { data } = useVenue(venueId);
  const [selectedDuration, setSelectedDuration] = useState(durations[0]);
  const scrollX = useSharedValue(0);

  const venue = useMemo(() => data || {}, [data]);
  const gallery = venue?.gallery?.length ? venue.gallery.slice(0, 3) : defaultGallery;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={gallery}
        keyExtractor={(item, index) => `${item}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <GalleryImage uri={item} index={index} scrollX={scrollX} />
        )}
        style={styles.galleryList}
      />

      <View style={styles.content}>
        <LinearGradient colors={['#F4F7FF', '#FFFFFF']} style={styles.hero}>
          <Text style={styles.title}>{venue?.name || 'Skyline Arena'}</Text>
          <Text style={styles.subtitle}>{venue?.city || 'Amman'} · {venue?.sport || 'Football'}</Text>
          <Text style={styles.meta}>{venue?.description || 'Indoor premium pitch with lounge area.'}</Text>
          {venue?.offer ? (
            <View style={styles.offerPill}>
              <Text style={styles.offerText}>{venue.offer}</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Size</Text>
            <Text style={styles.infoValue}>{venue?.size || '5v5'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Players</Text>
            <Text style={styles.infoValue}>{venue?.min_players || 6} - {venue?.max_players || 14}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{venue?.location || 'Abdoun'}</Text>
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

        <Text style={styles.sectionTitle}>Popular Slots</Text>
        <SlotGrid
          slots={venue?.slots || [{ id: '1', label: '6:00 PM' }, { id: '2', label: '7:00 PM' }]}
          selectedSlotId={null}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={() => goToBook(router, venueId || '1')}
        >
          <Text style={styles.buttonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  galleryList: {
    flexGrow: 0,
  },
  galleryCard: {
    width,
    height: 240,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  content: {
    flex: 1,
    paddingBottom: 24,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: -32,
    padding: 20,
    borderRadius: 24,
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
  },
  subtitle: {
    fontSize: 13,
    color: '#6C7A92',
    marginTop: 6,
  },
  meta: {
    fontSize: 12,
    color: '#7A8BA8',
    marginTop: 10,
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
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F4F7FF',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6C7A92',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#11223A',
    marginTop: 6,
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
  },
});
