import React, { useMemo } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';

import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.74;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SliderCard({ item, onPress }) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const themeGradient = useMemo(
    () => (isDark ? ['#0F172A', '#1E293B'] : ['#F8FAFC', '#FDE68A']),
    [isDark]
  );

  return (
    <AnimatedPressable
      onPress={() => onPress?.(item)}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 18 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18 });
      }}
      style={[styles.card, animatedStyle]}
    >
      <View style={[styles.cardInner, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={themeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {item?.image ? (
          <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.05)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.badgeRow}>
          <Sparkles size={14} color={colors.white} />
          <Text variant="caption" weight="bold" style={{ color: colors.white }}>
            {item?.badge || 'Featured'}
          </Text>
        </View>
        <View style={styles.content}>
          <Text variant="h4" weight="bold" style={styles.title}>
            {item?.title || 'Elite Court Experience'}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            {item?.subtitle || 'Premium courts with curated services'}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export function AcademySlider({ items = [], onPress }) {
  const data = items.length
    ? items
    : [
        { id: '1', title: 'Desert Sky Arena', subtitle: 'Sunset slots and lounge' },
        { id: '2', title: 'Coastal Paddle Club', subtitle: 'Ocean breeze sessions' },
      ];

  return (
    <View>
      <Animated.FlatList
        data={data}
        horizontal
        keyExtractor={(item, index) => item.id?.toString?.() || `slide-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <SliderCard item={item} onPress={onPress} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardInner: {
    height: 190,
    justifyContent: 'space-between',
  },
  badgeRow: {
    marginTop: spacing.md,
    marginLeft: spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    color: '#FFFFFF',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: spacing.xs,
  },
});
