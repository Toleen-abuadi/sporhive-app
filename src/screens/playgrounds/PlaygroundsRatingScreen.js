// Playgrounds rating flow driven by deep-link token resolution.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';

const criteriaList = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'staff', label: 'Staff' },
  { key: 'amenities', label: 'Amenities' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function StarButton({ filled, onPress }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 16 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16 });
      }}
      style={animatedStyle}
    >
      <Star size={28} color={filled ? colors.accentOrange : colors.border} />
    </AnimatedPressable>
  );
}

function RatingRow({ label, value, onChange }) {
  return (
    <View style={styles.ratingRow}>
      <Text variant="bodySmall" weight="semibold">
        {label}
      </Text>
      <View style={styles.starRow}>
        {Array.from({ length: 5 }).map((_, index) => {
          const score = index + 1;
          return (
            <StarButton
              key={`${label}-${score}`}
              filled={score <= value}
              onPress={() => onChange(score)}
            />
          );
        })}
      </View>
    </View>
  );
}

export function PlaygroundsRatingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params?.token || params?.id || null;
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [overall, setOverall] = useState(5);
  const [criteriaScores, setCriteriaScores] = useState(() => ({
    cleanliness: 5,
    staff: 5,
    amenities: 5,
  }));
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(() => overall > 0 && allowed && !submitting, [overall, allowed, submitting]);

  const resolveRating = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setMessage('Invalid rating link.');
      return;
    }
    setLoading(true);
    const resolved = await playgroundsApi.resolveRatingToken(token);
    if (!resolved?.success) {
      setMessage(resolved?.error?.message || 'Unable to resolve rating link.');
      setLoading(false);
      return;
    }
    const data = resolved.data || {};
    const resolvedBookingId = data.booking_id || data.bookingId || data.id || null;
    const resolvedUserId = data.user_id || data.userId || null;
    setBookingId(resolvedBookingId);
    setUserId(resolvedUserId);

    const canRate = await playgroundsApi.canRate({ booking_id: resolvedBookingId, user_id: resolvedUserId });
    if (!canRate?.success || canRate?.data?.allowed === false || canRate?.data?.can_rate === false) {
      setAllowed(false);
      setMessage(canRate?.data?.message || 'This booking is not eligible for rating.');
      setLoading(false);
      return;
    }
    setAllowed(true);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    resolveRating();
  }, [resolveRating]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const response = await playgroundsApi.createRating({
      booking_id: bookingId,
      user_id: userId,
      overall,
      criteria_scores: criteriaScores,
      comment,
    });
    if (!response?.success) {
      setMessage(response?.error?.message || 'Rating submission failed.');
      setSubmitting(false);
      return;
    }
    setSuccess(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Preparing your rating..." />
      </Screen>
    );
  }

  if (success) {
    return (
      <Screen scroll contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text variant="h3" weight="bold">
            Thanks for your feedback!
          </Text>
          <Text variant="body" color={colors.textSecondary}>
            Your rating helps the community book better experiences.
          </Text>
          <Button onPress={() => router.replace('/playgrounds/my-bookings')}>
            Back to bookings
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text variant="h3" weight="bold">
          Rate your experience
        </Text>
        <Text variant="body" color={colors.textSecondary}>
          Share your thoughts to help the community.
        </Text>
        {message ? (
          <Text variant="bodySmall" color={colors.error}>
            {message}
          </Text>
        ) : null}

        {!allowed ? (
          <View style={styles.infoBlock}>
            <Text variant="body" color={colors.textSecondary}>
              {message || 'This booking can no longer be rated.'}
            </Text>
            <Button variant="secondary" onPress={resolveRating}>
              Retry
            </Button>
            <Button variant="secondary" onPress={() => router.replace('/playgrounds')}>
              Go home
            </Button>
          </View>
        ) : (
          <>
            <RatingRow label="Overall" value={overall} onChange={setOverall} />
            <View style={styles.criteriaBlock}>
              {criteriaList.map((criterion) => (
                <RatingRow
                  key={criterion.key}
                  label={criterion.label}
                  value={criteriaScores[criterion.key]}
                  onChange={(value) =>
                    setCriteriaScores((prev) => ({
                      ...prev,
                      [criterion.key]: value,
                    }))
                  }
                />
              ))}
            </View>
            <Input
              label="Comment"
              placeholder="Share a note for the venue"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              style={styles.textArea}
            />
            <Button onPress={handleSubmit} loading={submitting} disabled={!canSubmit}>
              Submit rating
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  ratingRow: {
    gap: spacing.xs,
  },
  starRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  criteriaBlock: {
    gap: spacing.md,
  },
  textArea: {
    minHeight: 120,
  },
  infoBlock: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
});
