import React, { useMemo } from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Star } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Chip } from '../ui/Chip';
import { spacing, borderRadius, fontSize, shadows } from '../../theme/tokens';

export function PlaygroundCard({ title, location, sport, imageUrl, rating, priceLabel, onPress }) {
  const { colors } = useTheme();

  const ratingLabel = useMemo(() => {
    if (!rating && rating !== 0) return null;
    return rating.toFixed(1);
  }, [rating]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`View ${title} details`}
    >
      <Card style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.coverWrap}>
          {imageUrl ? (
            <ImageBackground source={{ uri: imageUrl }} style={styles.cover} imageStyle={styles.coverImage}>
              <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.0)']}
                style={styles.coverOverlay}
              />
            </ImageBackground>
          ) : (
            <View style={[styles.coverFallback, { backgroundColor: colors.surface }]} />
          )}
          {ratingLabel ? (
            <View style={[styles.ratingBadge, { backgroundColor: colors.surface }]}>
              <Star size={12} color={colors.accentOrange} />
              <Text variant="caption" weight="bold" style={{ color: colors.textPrimary, marginLeft: 4 }}>
                {ratingLabel}
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
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.locationText}>
              {location || 'Location pending'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Chip label={sport || 'Multi-sport'} />
            {priceLabel ? (
              <Text variant="bodySmall" weight="semibold" color={colors.textPrimary}>
                {priceLabel}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.sm,
  },
  coverWrap: {
    position: 'relative',
  },
  cover: {
    height: 150,
    justifyContent: 'flex-end',
  },
  coverFallback: {
    height: 150,
  },
  coverImage: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  ratingBadge: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
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
  locationText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
