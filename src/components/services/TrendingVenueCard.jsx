import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { borderRadius, spacing } from '../../theme/tokens';

export function TrendingVenueCard({ title, imageUrl, onPress }) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.mediaWrap,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowOpacity: isDark ? 0 : 0.12,
          },
        ]}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <LinearGradient
            colors={
              isDark
                ? [colors.surface, colors.surfaceElevated || colors.surface]
                : [colors.accentOrange, colors.primarySoft]
            }
            style={styles.placeholder}
          >
            <View style={[styles.placeholderIcon, { backgroundColor: `${colors.accentOrange}33` }]}>
              <Feather name="activity" size={20} color={colors.accentOrange} />
            </View>
          </LinearGradient>
        )}
      </View>
      <Text variant="bodySmall" weight="semibold" style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 176,
    gap: spacing.sm,
  },
  mediaWrap: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
  },
  image: {
    width: '100%',
    height: 140,
    borderRadius: borderRadius.xl,
  },
  placeholder: {
    width: '100%',
    height: 140,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    paddingHorizontal: spacing.xs,
  },
});
