// Playgrounds rating flow driven by deep-link token resolution.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { playgroundsStore } from '../../services/playgrounds/playgrounds.store';
import { useBookingsList } from '../../services/playgrounds/playgrounds.hooks';
import { usePlaygroundsRouter } from '../../navigation/playgrounds.routes';

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

function ManualBookingPicker({ selectedBookingId, onSelect }) {
  const { colors } = useTheme();
  const { data, loading, error, load } = useBookingsList();

  if (loading) {
    return <LoadingState message="Loading your bookings..." />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No bookings available"
        message="Book a court before leaving a rating."
        actionLabel="Refresh"
        onAction={load}
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to load bookings"
        message={error?.message || 'Try again to load your bookings.'}
        actionLabel="Retry"
        onAction={load}
      />
    );
  }

  return (
    <View style={styles.bookingList}>
      {data.map((booking, index) => {
        const id = booking?.id || booking?.booking_id || index;
        const isActive = String(id) === String(selectedBookingId);
        return (
          <Pressable
            key={`booking-${id}`}
            onPress={() => onSelect(booking)}
            style={[
              styles.bookingCard,
              {
                backgroundColor: isActive ? colors.accentOrange : colors.surface,
                borderColor: isActive ? colors.accentOrange : colors.border,
              },
            ]}
          >
            <View style={styles.bookingHeader}>
              <Text variant="body" weight="bold" color={isActive ? colors.white : colors.textPrimary}>
                {booking?.venue_name || booking?.venue || 'Venue'}
              </Text>
              <Text variant="caption" color={isActive ? colors.white : colors.textMuted}>
                {booking?.status || 'Booking'}
              </Text>
            </View>
            <Text variant="caption" color={isActive ? colors.white : colors.textMuted}>
              {booking?.date || booking?.booking_date || 'Upcoming'} · {booking?.time || booking?.start_time || 'Time'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PlaygroundsRatingScreen({ mode = 'token', token: tokenProp, preflight }) {
  const { colors } = useTheme();
  const { goToMyBookings, goToPlaygroundsHome } = usePlaygroundsRouter();
  const params = useLocalSearchParams();
  const tokenParam = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : null;
  const token = tokenProp || tokenParam || params?.id || null;
  const isTokenMode = mode !== 'manual';

  const [loading, setLoading] = useState(isTokenMode && !preflight);
  const [allowed, setAllowed] = useState(Boolean(preflight?.allowed));
  const [message, setMessage] = useState(preflight?.message || '');
  const [bookingId, setBookingId] = useState(preflight?.bookingId || null);
  const [userId, setUserId] = useState(preflight?.userId || null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [overall, setOverall] = useState(5);
  const [criteriaScores, setCriteriaScores] = useState(() => ({
    cleanliness: 5,
    staff: 5,
    amenities: 5,
  }));
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(
    () => overall > 0 && allowed && Boolean(bookingId) && !submitting,
    [overall, allowed, bookingId, submitting]
  );

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
    setMessage('');
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!isTokenMode || preflight) return;
    resolveRating();
  }, [resolveRating, isTokenMode, preflight]);

  useEffect(() => {
    if (!isTokenMode || !preflight) return;
    setLoading(Boolean(preflight.loading));
    setAllowed(Boolean(preflight.allowed));
    setMessage(preflight.message || '');
    setBookingId(preflight.bookingId || null);
    setUserId(preflight.userId || null);
  }, [isTokenMode, preflight]);

  const handleManualSelect = useCallback(async (booking) => {
    if (!booking) return;
    setSelectedBooking(booking);
    setSelectionLoading(true);
    setAllowed(false);
    setMessage('');

    const resolvedUserId = userId || (await playgroundsStore.getPublicUserId());
    const resolvedBookingId = booking?.id || booking?.booking_id || null;
    setUserId(resolvedUserId);
    setBookingId(resolvedBookingId);

    const canRate = await playgroundsApi.canRate({ booking_id: resolvedBookingId, user_id: resolvedUserId });
    if (!canRate?.success || canRate?.data?.allowed === false || canRate?.data?.can_rate === false) {
      setAllowed(false);
      setMessage(canRate?.data?.message || 'This booking is not eligible for rating.');
      setSelectionLoading(false);
      return;
    }
    setAllowed(true);
    setSelectionLoading(false);
  }, [userId]);

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

  if (isTokenMode && loading) {
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
          <Button onPress={() => goToMyBookings({ method: 'replace' })}>
            Back to bookings
          </Button>
        </View>
      </Screen>
    );
  }

  const showEligibilityBlock = !allowed && (isTokenMode || selectedBooking);
  const handleRetry = () => {
    if (isTokenMode) {
      resolveRating();
      return;
    }
    if (selectedBooking) {
      handleManualSelect(selectedBooking);
    }
  };

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

        {!isTokenMode ? (
          <View style={styles.manualBlock}>
            <Text variant="body" weight="semibold">
              Choose a booking to rate
            </Text>
            <ManualBookingPicker selectedBookingId={bookingId} onSelect={handleManualSelect} />
            {selectionLoading ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color={colors.accentOrange} />
                <Text variant="caption" color={colors.textMuted}>
                  Checking eligibility...
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {showEligibilityBlock ? (
          <View style={styles.infoBlock}>
            <Text variant="body" color={colors.textSecondary}>
              {message || 'This booking can no longer be rated.'}
            </Text>
            <Button variant="secondary" onPress={handleRetry}>
              Retry
            </Button>
            <Button variant="secondary" onPress={() => goToPlaygroundsHome({ method: 'replace' })}>
              Go home
            </Button>
          </View>
        ) : null}

        {allowed ? (
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
        ) : null}
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
    gap: spacing.sm,
  },
  starRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  criteriaBlock: {
    gap: spacing.md,
  },
  infoBlock: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  textArea: {
    minHeight: 120,
  },
  manualBlock: {
    gap: spacing.md,
  },
  bookingList: {
    gap: spacing.sm,
  },
  bookingCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
