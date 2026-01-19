import React, { useCallback } from 'react';
import { ImageBackground, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { MapPin, Star, Tag } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { Chip } from '../ui/Chip';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

type VenueCardProps = {
  title: string;
  location: string;
  imageUrl?: string | null;
  rating?: number | null;
  hasOffer?: boolean;
  discountLabel?: string | null;
  priceLabel?: string | null;
  activityLabel?: string | null;
  onPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VenueCard({
  title,
  location,
  imageUrl,
  rating,
  hasOffer,
  discountLabel,
  priceLabel,
  activityLabel,
  onPress,
}: VenueCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const pressIn = useCallback(() => {
    scale.value = withTiming(0.98, { duration: 120, easing: Easing.out(Easing.quad) });
  }, [scale]);

  const pressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      android_ripple={Platform.OS === 'android' ? { color: 'rgba(0,0,0,0.08)' } : undefined}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={`View ${title} details`}
    >
      <View style={styles.coverWrap}>
        {imageUrl ? (
          <ImageBackground source={{ uri: imageUrl }} style={styles.cover} imageStyle={styles.coverImage} />
        ) : (
          <View style={[styles.cover, styles.coverFallback, { backgroundColor: colors.surfaceElevated }]} />
        )}
        {rating !== null && rating !== undefined ? (
          <View style={[styles.ratingBadge, { backgroundColor: colors.surface }]}>
            <Star size={12} color={colors.accentOrange} />
            <Text variant="caption" weight="bold" style={{ marginLeft: spacing.xs }}>
              {Number(rating).toFixed(1)}
            </Text>
          </View>
        ) : null}
        {hasOffer ? (
          <View style={[styles.discountBadge, { backgroundColor: colors.accentOrange }]}>
            <Tag size={12} color={colors.white} />
            <Text variant="caption" weight="bold" style={{ marginLeft: spacing.xs, color: colors.white }}>
              {discountLabel || 'Offer'}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text variant="h4" weight="semibold">
          {title}
        </Text>
        <View style={styles.locationRow}>
          <MapPin size={14} color={colors.textMuted} />
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginLeft: spacing.xs }}>
            {location || 'Location pending'}
          </Text>
        </View>
        <View style={styles.footer}>
          {activityLabel ? <Chip label={activityLabel} /> : null}
          <Text variant="bodySmall" weight="semibold">
            {priceLabel || 'Check pricing'}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  coverWrap: {
    position: 'relative',
  },
  cover: {
    height: 150,
  },
  coverFallback: {
    justifyContent: 'center',
  },
  coverImage: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
