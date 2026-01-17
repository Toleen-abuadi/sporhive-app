// API fields used: name, base_location, pitch_size, area_size, min_players, max_players,
// avg_rating, ratings_count, price, duration, images, has_special_offer, special_offer_note,
// academy_profile.public_name, academy_profile.location_text, academy_profile.tags.
import { Image, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const resolveVenueImage = (images = []) => {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  if (typeof first === 'string') return first;
  if (first?.url) return first.url;
  if (first?.uri) return first.uri;
  return null;
};

const formatStars = (rating = 0) => {
  const score = Math.max(0, Math.min(5, Number(rating) || 0));
  const filled = Math.round(score);
  return '★'.repeat(filled).padEnd(5, '☆');
};

const formatPrice = (venue) => {
  const fallbackPrice = Array.isArray(venue?.duration) ? venue?.duration?.[0]?.base_price : null;
  const priceValue = venue?.price ?? fallbackPrice;
  if (priceValue == null || priceValue === '') return 'Price N/A';
  return `${priceValue} JOD`;
};

export const VenueCard = ({ venue, onPress }) => {
  const scheme = useColorScheme();
  const colors = scheme === 'dark'
    ? ['#1F2338', '#141725']
    : ['#FFFFFF', '#F3F7FF'];

  const imageUri = resolveVenueImage(venue?.images);
  const ratingValue = venue?.avg_rating ?? 0;
  const ratingCount = venue?.ratings_count ?? 0;
  const locationText = venue?.base_location || venue?.academy_profile?.location_text || 'N/A';
  const academyName = venue?.academy_profile?.public_name;
  const tags = Array.isArray(venue?.academy_profile?.tags) ? venue.academy_profile.tags : [];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient colors={colors} style={styles.card}>
        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Playground</Text>
            </View>
          )}
          {venue?.has_special_offer ? (
            <View style={styles.offerBadge}>
              <Text style={styles.offerText}>Offer</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <View>
            <Text style={styles.title}>{venue?.name || 'Venue'}</Text>
            {academyName ? (
              <Text style={styles.academy}>{academyName}</Text>
            ) : null}
            <Text style={styles.subtitle}>{locationText}</Text>
            <Text style={styles.dimensions}>
              Pitch: {venue?.pitch_size || 'N/A'} · Area: {venue?.area_size || 'N/A'}
            </Text>
            <Text style={styles.dimensions}>
              Players: {venue?.min_players ?? 'N/A'} - {venue?.max_players ?? 'N/A'}
            </Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={styles.ratingBlock}>
              <Text style={styles.stars}>{formatStars(ratingValue)}</Text>
              <Text style={styles.reviewCount}>({ratingCount})</Text>
            </View>
            <Text style={styles.price}>{formatPrice(venue)}</Text>
          </View>
          {venue?.special_offer_note ? (
            <Text style={styles.offerNote}>{venue.special_offer_note}</Text>
          ) : null}
          {tags.length ? (
            <View style={styles.tagsRow}>
              {tags.slice(0, 3).map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 16,
    shadowColor: '#0B1A33',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  imageWrap: {
    width: 90,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E6EDF8',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 11,
    color: '#7A8BA8',
  },
  offerBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FF8A00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  offerText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  meta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
  },
  academy: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F6AD7',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6C7A92',
    marginTop: 4,
  },
  dimensions: {
    fontSize: 11,
    color: '#6C7A92',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stars: {
    fontSize: 12,
    color: '#FFB400',
    fontWeight: '700',
  },
  reviewCount: {
    fontSize: 11,
    color: '#6C7A92',
  },
  price: {
    fontSize: 12,
    color: '#2D3E5E',
    fontWeight: '600',
  },
  offerNote: {
    fontSize: 11,
    color: '#E67E22',
    marginTop: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tagChip: {
    backgroundColor: '#FFE7CC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    color: '#D56B00',
    fontWeight: '600',
  },
});
