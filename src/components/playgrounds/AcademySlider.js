// API fields used: public_name, location_text, hero_image (base64), tags.
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const fallbackSlides = [
  {
    id: 'premium',
    public_name: 'Premium Playgrounds',
    location_text: 'Handpicked venues, prime times, instant booking.',
    tags: [],
  },
  {
    id: 'flexible',
    public_name: 'Flexible Scheduling',
    location_text: 'Move fast with real-time availability updates.',
    tags: [],
  },
];

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

export const AcademySlider = ({ items = fallbackSlides }) => {
  const scheme = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const gradientColors = useMemo(() => (
    scheme === 'dark'
      ? ['#2D2A4A', '#1C1B2A']
      : ['#EAF3FF', '#FFFFFF']
  ), [scheme]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}> 
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((slide, index) => {
          const imageUri = resolveHeroImage(slide?.hero_image);
          const tags = Array.isArray(slide?.tags) ? slide.tags : [];
          const key = slide?.academy_profile_id || slide?.academy_id || slide?.id || `${slide?.public_name}-${index}`;

          return (
            <LinearGradient
              key={key}
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              {imageUri ? (
                <ImageBackground source={{ uri: imageUri }} style={styles.image} imageStyle={styles.imageRadius}>
                  <View style={styles.overlay}>
                    <Text style={styles.title}>{slide?.public_name || 'Academy'}</Text>
                    <Text style={styles.subtitle}>{slide?.location_text || ''}</Text>
                    {tags.length ? (
                      <View style={styles.tagsRow}>
                        {tags.slice(0, 3).map((tag) => (
                          <View key={tag} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </ImageBackground>
              ) : (
                <View style={styles.placeholderCard}>
                  <Text style={styles.title}>{slide?.public_name || 'Academy'}</Text>
                  <Text style={styles.subtitle}>{slide?.location_text || ''}</Text>
                  {tags.length ? (
                    <View style={styles.tagsRow}>
                      {tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
            </LinearGradient>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 280,
    borderRadius: 20,
    shadowColor: '#0B1A33',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
    justifyContent: 'flex-end',
  },
  imageRadius: {
    borderRadius: 20,
  },
  overlay: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  placeholderCard: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#E8EEF9',
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#FF8A00',
  },
  tagText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
