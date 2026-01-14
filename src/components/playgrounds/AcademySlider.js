import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
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
    title: 'Premium Playgrounds',
    subtitle: 'Handpicked venues, prime times, instant booking.',
  },
  {
    id: 'flexible',
    title: 'Flexible Scheduling',
    subtitle: 'Move fast with real-time availability updates.',
  },
];

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
        {items.map((slide) => (
          <LinearGradient
            key={slide.id || slide.title}
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </LinearGradient>
        ))}
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
    padding: 20,
    borderRadius: 20,
    shadowColor: '#0B1A33',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#122B52',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#51607A',
    lineHeight: 20,
  },
});
