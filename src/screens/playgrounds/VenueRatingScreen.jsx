import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BackButton } from '../../components/ui/BackButton';
import { endpoints } from '../../services/api/endpoints';
import { spacing } from '../../theme/tokens';

const CRITERIA = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'staff_service', label: 'Staff service' },
  { key: 'field_quality', label: 'Field quality' },
  { key: 'booking_experience', label: 'Booking experience' },
  { key: 'value_for_money', label: 'Value for money' },
  { key: 'safety_security', label: 'Safety & security' },
];

function StarsRow({ value, onChange, label }) {
  return (
    <View style={styles.starsRow}>
      <Text variant="bodySmall" weight="semibold">
        {label}
      </Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={`${label}-${star}`}
            onPress={() => onChange(star)}
            accessibilityRole="button"
            accessibilityLabel={`Set ${label} rating to ${star}`}
          >
            <Text variant="h4" weight={value >= star ? 'bold' : 'normal'}>
              {value >= star ? '★' : '☆'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function VenueRatingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { bookingId, userId } = useLocalSearchParams();

  const [rating, setRating] = useState(0);
  const [criteria, setCriteria] = useState({
    cleanliness: 0,
    staff_service: 0,
    field_quality: 0,
    booking_experience: 0,
    value_for_money: 0,
    safety_security: 0,
  });
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [canRate, setCanRate] = useState(true);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const checkCanRate = useCallback(async () => {
    try {
      const res = await endpoints.playgrounds.ratingCanRate({
        booking_id: bookingId,
        user_id: userId,
      });
      const allowed = res?.can_rate ?? res?.data?.can_rate ?? true;
      if (!allowed) {
        setCanRate(false);
        setMessage(res?.message || 'You have already rated this booking.');
      }
    } catch (err) {
      setCanRate(false);
      setMessage(err?.message || 'Unable to verify rating eligibility.');
    }
  }, [bookingId, userId]);

  useEffect(() => {
    checkCanRate();
  }, [checkCanRate]);

  const handleSubmit = useCallback(async () => {
    if (!rating) {
      setMessage('Please select an overall rating.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await endpoints.playgrounds.ratingCreate({
        booking_id: bookingId,
        user_id: userId,
        rating,
        ...criteria,
        comment: comment || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setMessage(err?.message || 'Unable to submit rating.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, comment, criteria, rating, userId]);

  return (
    <Screen safe>
      <AppHeader title="Rate your venue" leftSlot={<BackButton />} />
      <View style={styles.container}>
        <Text variant="bodySmall" color={colors.textSecondary}>
          Tell us about your experience.
        </Text>
        {!canRate ? (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {message}
          </Text>
        ) : success ? (
          <View style={styles.successCard}>
            <Text variant="h4" weight="semibold">
              Thank you!
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Your feedback helps improve the experience for everyone.
            </Text>
            <Button onPress={() => router.replace('/playgrounds/bookings')} accessibilityLabel="Go to bookings">
              Go to bookings
            </Button>
          </View>
        ) : (
          <>
            <StarsRow label="Overall rating" value={rating} onChange={setRating} />
            {CRITERIA.map((criterion) => (
              <StarsRow
                key={criterion.key}
                label={criterion.label}
                value={criteria[criterion.key]}
                onChange={(value) =>
                  setCriteria((prev) => ({
                    ...prev,
                    [criterion.key]: value,
                  }))
                }
              />
            ))}
            <Input
              label="Comment (optional)"
              value={comment}
              onChangeText={setComment}
              placeholder="Share a quick note"
              accessibilityLabel="Rating comment"
            />
            {message ? (
              <Text variant="caption" color={colors.error}>
                {message}
              </Text>
            ) : null}
            <Button onPress={handleSubmit} loading={loading} accessibilityLabel="Submit rating">
              Submit rating
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  starsRow: {
    gap: spacing.xs,
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  successCard: {
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.md,
  },
});
