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
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <LinearGradient
          colors={
            isDark
              ? [colors.surface, colors.surfaceElevated || colors.surface]
              : [colors.surface, `${colors.accentOrange}1A`]
          }
          style={styles.placeholder}
        >
          <View style={[styles.placeholderIcon, { backgroundColor: `${colors.accentOrange}22` }]}>
            <Feather name="image" size={20} color={colors.accentOrange} />
          </View>
        </LinearGradient>
      )}
      <Text variant="bodySmall" weight="semibold" style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    gap: spacing.sm,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.lg,
  },
  placeholder: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    paddingHorizontal: spacing.xs,
  },
});
