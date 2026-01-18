// API fields used: name, base_location, pitch_size, area_size, min_players, max_players,
// avg_rating, ratings_count, price, duration, images, has_special_offer, special_offer_note,
// academy_profile.public_name, academy_profile.location_text, academy_profile.tags, academy_profile.logo.
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
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StickyFooterCTA } from '../../components/playgrounds/StickyFooterCTA';
import { goToBook } from '../../navigation/playgrounds.routes';
import { useVenue } from '../../services/playgrounds/playgrounds.hooks';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

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
  return images.map((img) => resolveImageUri(img)).filter(Boolean);
};

const resolvePrice = (venue) => {
  if (venue?.price != null && venue?.price !== '') return venue.price;
  const duration = Array.isArray(venue?.duration) ? venue.duration : [];
  return duration[0]?.base_price ?? null;
};

const getInitials = (value = '') =>
  value
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

const resolvePaymentMethods = (venue) => {
  const raw =
    venue?.academy_profile?.payment_methods ||
    venue?.payment_methods ||
    venue?.payment_type ||
    [];
  const methods = new Set();
  if (Array.isArray(raw)) {
    raw.forEach((method) => methods.add(String(method).toLowerCase()));
  } else if (typeof raw === 'string') {
    methods.add(raw.toLowerCase());
  }

  if (venue?.academy_profile?.allow_cash || venue?.allow_cash) methods.add('cash');
  if (venue?.academy_profile?.allow_cliq || venue?.allow_cliq) methods.add('cliq');
  if (venue?.academy_profile?.allow_cash_payment_on_date || venue?.allow_cash_payment_on_date) {
    methods.add('cash_payment_on_date');
  }

  if (methods.size === 0) {
    return ['cash', 'cash_payment_on_date', 'cliq'];
  }

  return Array.from(methods);
};

export const PlaygroundsVenueDetailsScreen = () => {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);
  const { data, loading, error } = useVenue(venueId);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const venue = useMemo(() => data || {}, [data]);
  const gallery = useMemo(() => buildGallery(venue?.images), [venue?.images]);
  const durations = useMemo(
    () => (Array.isArray(venue?.duration) ? venue.duration : []),
    [venue?.duration],
  );
  const effectiveDuration = selectedDuration || durations[0] || null;
  const priceValue = resolvePrice(venue);
  const academyName = venue?.academy_profile?.public_name || venue?.name || 'Academy';
  const academyLogo = venue?.academy_profile?.logo || venue?.academy_profile?.image || null;
  const tags = Array.isArray(venue?.academy_profile?.tags) ? venue.academy_profile.tags : [];
  const paymentMethods = useMemo(() => resolvePaymentMethods(venue), [venue]);

  const renderGallery = () => {
    if (!gallery.length) {
      return (
        <View style={[styles.galleryPlaceholder, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.placeholderText, { color: theme.colors.textMuted }]}>
            No images available
          </Text>
        </View>
      );
    }

    return (
      <View>
        <FlatList
          data={gallery}
          keyExtractor={(item, index) => `${item}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setActiveIndex(nextIndex);
          }}
          renderItem={({ item }) => (
            <View style={styles.galleryCard}>
              <Image source={{ uri: item }} style={styles.galleryImage} resizeMode="cover" />
              <LinearGradient colors={['transparent', theme.colors.overlay]} style={styles.galleryOverlay} />
              <View style={styles.galleryMeta}>
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
                    {Number(venue?.avg_rating || 0).toFixed(1)} ★ ({venue?.ratings_count || 0})
                  </Text>
                </View>
              </View>
            </View>
          )}
          style={styles.galleryList}
        />
        <View style={styles.dotsRow}>
          {gallery.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    activeIndex === index ? theme.colors.primary : theme.colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.textMuted }}>Loading venue details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>Failed to load venue details</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {renderGallery()}

          <View style={[styles.hero, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{venue?.name || 'Venue'}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              {venue?.base_location || venue?.academy_profile?.location_text || 'N/A'}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
              {academyName}
            </Text>
            {venue?.has_special_offer && venue?.special_offer_note ? (
              <View style={[styles.offerPill, { backgroundColor: theme.colors.primarySoft }]}>
                <Text style={[styles.offerText, { color: theme.colors.primary }]}>
                  {venue.special_offer_note}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.infoGrid}>
            {[
              { label: 'Pitch Size', value: venue?.pitch_size || 'N/A' },
              { label: 'Area Size', value: venue?.area_size || 'N/A' },
              {
                label: 'Players',
                value: `${venue?.min_players ?? 'N/A'} - ${venue?.max_players ?? 'N/A'}`,
              },
              { label: 'Rating', value: `${venue?.avg_rating ?? 'N/A'}` },
              { label: 'Price', value: priceValue != null ? `${priceValue} JOD` : 'N/A' },
            ].map((item) => (
              <View key={item.label} style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {tags.length ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Features</Text>
              <View style={styles.tagsRow}>
                {tags.slice(0, 6).map((tag) => (
                  <View
                    key={tag}
                    style={[styles.tagChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  >
                    <Text style={[styles.tagText, { color: theme.colors.textPrimary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {durations.length ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Choose Duration</Text>
              <View style={styles.durationRow}>
                {durations.map((duration) => {
                  const isSelected = effectiveDuration?.id === duration.id;
                  return (
                    <TouchableOpacity
                      key={duration.id}
                      style={[
                        styles.durationChip,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setSelectedDuration(duration)}
                    >
                      <Text
                        style={[
                          styles.durationText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary },
                        ]}
                      >
                        {duration?.minutes || duration?.duration_minutes
                          ? `${duration?.minutes ?? duration?.duration_minutes} min`
                          : 'Duration'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Payment Methods</Text>
            <View style={styles.tagsRow}>
              {paymentMethods.map((method) => (
                <View
                  key={method}
                  style={[styles.tagChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <Text style={[styles.tagText, { color: theme.colors.textPrimary }]}>
                    {method.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Availability</Text>
            <View style={[styles.notice, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.noticeText, { color: theme.colors.textMuted }]}>
                Check availability during booking to view time slots.
              </Text>
            </View>
          </View>
        </ScrollView>

        <StickyFooterCTA
          priceLabel="From"
          priceValue={priceValue != null ? `${priceValue} JOD` : 'Price N/A'}
          buttonLabel="Book Now"
          onPress={() => goToBook(router, venue?.id || venueId)}
          helperText="Taxes included"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
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
    fontSize: 16,
  },
  content: {
    paddingBottom: 24,
  },
  galleryList: {
    height: 260,
  },
  galleryCard: {
    width,
    height: 260,
    paddingHorizontal: 12,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  galleryOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    height: 90,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  galleryMeta: {
    position: 'absolute',
    top: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    paddingVertical: 6,
    borderRadius: 14,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  galleryPlaceholder: {
    width,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    marginHorizontal: 12,
  },
  placeholderText: {
    fontSize: 14,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
  },
  offerPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  offerText: {
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
    padding: 12,
    borderRadius: 16,
  },
  infoLabel: {
    fontSize: 11,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
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
    borderWidth: 1,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notice: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  noticeText: {
    fontSize: 12,
  },
});
