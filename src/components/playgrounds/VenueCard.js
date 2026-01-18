import { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

const resolveVenueImage = (images = []) => {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  if (typeof first === 'string') return first;
  if (first?.url) return first.url;
  if (first?.uri) return first.uri;
  return null;
};

const formatPrice = (venue) => {
  const fallbackPrice = Array.isArray(venue?.duration) ? venue?.duration?.[0]?.base_price : null;
  const priceValue = venue?.price ?? fallbackPrice;
  if (priceValue == null || priceValue === '') return 'Price N/A';
  return `${priceValue} JOD`;
};

const getInitials = (value = '') => {
  if (!value) return 'A';
  return value
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const VenueCardComponent = ({ venue, onPress }) => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);
  const imageUri = resolveVenueImage(venue?.images);
  const ratingValue = Number(venue?.avg_rating || 0).toFixed(1);
  const ratingCount = venue?.ratings_count ?? 0;
  const locationText = venue?.base_location || venue?.academy_profile?.location_text || 'Location';
  const academyName = venue?.academy_profile?.public_name || venue?.name || 'Academy';
  const academyLogo = venue?.academy_profile?.logo || venue?.academy_profile?.image || null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.touch}>
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, { backgroundColor: theme.colors.surface }]} />
          )}
          <LinearGradient
            colors={['transparent', theme.colors.overlay]}
            style={styles.gradient}
          />
          <View style={styles.topRow}>
            <View style={[styles.logoBadge, { borderColor: theme.colors.border }]}>
              {academyLogo ? (
                <Image source={{ uri: academyLogo }} style={styles.logoImage} />
              ) : (
                <Text style={[styles.logoText, { color: theme.colors.textPrimary }]}>
                  {getInitials(academyName)}
                </Text>
              )}
            </View>
            <View style={[styles.ratingPill, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.ratingText, { color: theme.colors.textPrimary }]}>
                {ratingValue} ★ ({ratingCount})
              </Text>
            </View>
          </View>
          {venue?.has_special_offer ? (
            <View style={[styles.offerBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.offerText}>Offer</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {venue?.name || 'Venue'}
          </Text>
          <Text style={[styles.location, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {locationText}
          </Text>
          <View style={styles.bottomRow}>
            <Text style={[styles.price, { color: theme.colors.primary }]}>{formatPrice(venue)}</Text>
            <Text style={[styles.duration, { color: theme.colors.textMuted }]}>
              {venue?.duration?.[0]?.minutes ? `${venue.duration[0].minutes} min` : ''}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const VenueCard = memo(VenueCardComponent);

const styles = StyleSheet.create({
  touch: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageWrap: {
    height: 190,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
  },
  topRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ratingPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  offerBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  offerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  meta: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  location: {
    fontSize: 12,
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
  duration: {
    fontSize: 12,
    fontWeight: '600',
  },
});
