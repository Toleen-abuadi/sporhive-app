import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { TopBar } from '../../src/components/ui/TopBar';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { spacing, typography } from '../../src/theme/tokens';
import { canRateBooking, createRating } from '../../src/features/playgrounds/api/playgrounds.api';
import { getErrorMessage, isNetworkError } from '../../src/features/playgrounds/utils';

type RatingPayload = {
  can_rate?: boolean;
  reason?: string;
  message?: string;
};

const CRITERIA = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'staff_service', label: 'Staff service' },
  { key: 'field_quality', label: 'Field quality' },
  { key: 'booking_experience', label: 'Booking experience' },
  { key: 'value_for_money', label: 'Value for money' },
  { key: 'safety_security', label: 'Safety & security' },
] as const;

type CriteriaKey = (typeof CRITERIA)[number]['key'];

const getInitialCriteria = (): Record<CriteriaKey, number> =>
  CRITERIA.reduce((acc, item) => ({ ...acc, [item.key]: 0 }), {} as Record<CriteriaKey, number>);

const StarRating = ({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
}) => {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, index) => {
          const starValue = index + 1;
          const isActive = starValue <= value;
          return (
            <Pressable
              key={`${label}-${starValue}`}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${starValue} stars`}
              onPress={() => onChange(starValue)}
              style={styles.starButton}
            >
              <Text style={[styles.star, isActive && styles.starActive]}>
                {isActive ? '★' : '☆'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default function RatingFormScreen() {
  const router = useRouter();
  const { booking_id, user_id } = useLocalSearchParams();
  const bookingId = Array.isArray(booking_id) ? booking_id[0] : booking_id;
  const userId = Array.isArray(user_id) ? user_id[0] : user_id;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canRate, setCanRate] = useState(true);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNetworkFailure, setIsNetworkFailure] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [criteriaRatings, setCriteriaRatings] = useState<Record<CriteriaKey, number>>(getInitialCriteria);
  const [comment, setComment] = useState('');

  const payloadBase = useMemo(
    () => ({
      booking_id: bookingId,
      user_id: userId,
    }),
    [bookingId, userId],
  );

  const loadCanRate = useCallback(async () => {
    if (!bookingId || !userId) {
      setErrorMessage('Missing rating details.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setIsNetworkFailure(false);
    try {
      const response = await canRateBooking(payloadBase);
      const data = response as RatingPayload;
      const allowed = data.can_rate ?? false;
      setCanRate(allowed);
      setReason(data.reason ?? data.message ?? 'This booking is not eligible for rating.');
    } catch (error) {
      if (isNetworkError(error)) {
        setIsNetworkFailure(true);
        setErrorMessage(getErrorMessage(error, 'Network error. Please try again.'));
      } else {
        setErrorMessage(getErrorMessage(error, 'Unable to check rating eligibility.'));
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, payloadBase, userId]);

  useEffect(() => {
    void loadCanRate();
  }, [loadCanRate, retryKey]);

  const handleSubmit = async () => {
    if (!bookingId || !userId) return;
    setSubmitting(true);
    try {
      await createRating({
        booking_id: bookingId,
        user_id: userId,
        overall: overallRating,
        ...criteriaRatings,
        comment,
      });
      router.replace('/(playgrounds)');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to submit rating.'));
    } finally {
      setSubmitting(false);
    }
  };

  const formValid = overallRating > 0 && Object.values(criteriaRatings).every((value) => value > 0);

  if (loading) {
    return (
      <Screen>
        <TopBar title="Rate booking" onBack={() => router.replace('/(playgrounds)')} />
        <View style={styles.container}>
          <Skeleton height={24} width="60%" />
          <Skeleton height={18} width="80%" />
          <Skeleton height={44} width={160} radius={16} />
        </View>
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen>
        <TopBar title="Rate booking" onBack={() => router.replace('/(playgrounds)')} />
        <View style={styles.container}>
          <Text style={styles.title}>We couldn't load this rating</Text>
          <Text style={styles.subtitle}>{errorMessage}</Text>
          {isNetworkFailure ? (
            <PrimaryButton label="Retry" onPress={() => setRetryKey((prev) => prev + 1)} />
          ) : null}
          <PrimaryButton label="Back to Explore" onPress={() => router.replace('/(playgrounds)')} />
        </View>
      </Screen>
    );
  }

  if (!canRate) {
    return (
      <Screen>
        <TopBar title="Rate booking" onBack={() => router.replace('/(playgrounds)')} />
        <View style={styles.container}>
          <Text style={styles.title}>Rating unavailable</Text>
          <Text style={styles.subtitle}>{reason}</Text>
          <PrimaryButton label="Back to Explore" onPress={() => router.replace('/(playgrounds)')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Rate booking" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Leave a rating</Text>
        <StarRating label="Overall" value={overallRating} onChange={setOverallRating} />

        <View style={styles.section}>
          {CRITERIA.map((item) => (
            <StarRating
              key={item.key}
              label={item.label}
              value={criteriaRatings[item.key]}
              onChange={(next) => setCriteriaRatings((prev) => ({ ...prev, [item.key]: next }))}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.ratingLabel}>Comment</Text>
          <TextInput
            placeholder="Share more details about your experience"
            multiline
            value={comment}
            onChangeText={setComment}
            style={styles.commentInput}
          />
        </View>

        <PrimaryButton
          label={submitting ? 'Submitting...' : 'Submit rating'}
          onPress={handleSubmit}
          disabled={submitting || !formValid}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: '#64748B',
  },
  section: {
    gap: spacing.md,
  },
  ratingRow: {
    gap: spacing.sm,
  },
  ratingLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  starButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    fontSize: 24,
    color: '#CBD5F5',
  },
  starActive: {
    color: '#F97316',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
});
