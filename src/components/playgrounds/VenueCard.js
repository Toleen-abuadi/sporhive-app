import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Star } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { spacing, borderRadius, shadows } from '../../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VenueCard({ venue, onPress }) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heroGradient = useMemo(
    () => (isDark ? ['#111827', '#1F2937'] : ['#EFF6FF', '#FDE68A']),
    [isDark]
  );

  const imageUri = venue?.image || venue?.cover || null;
  const rating = venue?.rating ?? 4.8;

  return (
    <AnimatedPressable
      onPress={() => onPress?.(venue)}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 18 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18 });
      }}
      style={[styles.card, animatedStyle, { backgroundColor: colors.surface }]}
    >
      <View style={styles.imageWrap}>
        <LinearGradient colors={heroGradient} style={StyleSheet.absoluteFill} />
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']}
          style={StyleSheet.absoluteFill}
        />
        <Badge style={styles.ratingBadge}>
          <Star size={12} color={colors.accentOrange} />
          <Text variant="caption" weight="bold" style={styles.ratingText}>
            {rating.toFixed(1)}
          </Text>
        </Badge>
      </View>
      <View style={styles.content}>
        <Text variant="h4" weight="bold" style={[styles.title, { color: colors.textPrimary }]}>
          {venue?.name || 'Skyline Arena'}
        </Text>
        <View style={styles.locationRow}>
          <MapPin size={14} color={colors.textSecondary} />
          <Text variant="bodySmall" color={colors.textSecondary}>
            {venue?.location || 'Dubai, UAE'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text variant="bodySmall" weight="medium" color={colors.accentOrange}>
            {venue?.price || 'AED 120 / hour'}
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            {venue?.surface || 'Indoor · Pro Turf'}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  imageWrap: {
    height: 160,
    position: 'relative',
  },
  ratingBadge: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  ratingText: {
    color: '#1F2937',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {},
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
