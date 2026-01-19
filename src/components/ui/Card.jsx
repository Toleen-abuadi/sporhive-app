import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { getColors } from '../../theme/colors';
import { radius, spacing, typography } from '../../theme/tokens';

export function Card({ children, mode = 'light', style }) {
  const colors = getColors(mode);
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function ImageCard({ imageUri, title, rating, mode = 'light', style }) {
  const colors = getColors(mode);
  return (
    <ImageBackground source={{ uri: imageUri }} style={[styles.imageCard, style]} imageStyle={styles.imageRadius}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}
      >
        <Text style={[styles.imageTitle, { color: '#FFFFFF' }]}>{title}</Text>
        {rating ? (
          <View style={[styles.ratingChip, { backgroundColor: colors.surfaceElevated }]}
          >
            <Text style={[styles.ratingText, { color: colors.textPrimary }]}>★ {rating}</Text>
          </View>
        ) : null}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  imageCard: {
    height: 180,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  imageRadius: {
    borderRadius: radius.lg,
  },
  overlay: {
    padding: spacing.md,
  },
  imageTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '600',
  },
  ratingChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  ratingText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '600',
  },
});
