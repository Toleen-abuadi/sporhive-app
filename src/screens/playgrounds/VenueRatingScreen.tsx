import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { endpoints } from '../../services/api/endpoints';
import { spacing } from '../../theme/tokens';

export function VenueRatingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { bookingId, userId } = useLocalSearchParams();

  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [canRate, setCanRate] = useState(true);
  const [message, setMessage] = useState('');

  const ratingOptions = useMemo(() => [1, 2, 3, 4, 5], []);

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
      setMessage('Please select a rating.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await endpoints.playgrounds.ratingCreate({
        booking_id: bookingId,
        user_id: userId,
        rating,
        comment: comment || undefined,
      });
      setMessage('Thanks for your feedback!');
      router.replace('/playgrounds/explore');
    } catch (err) {
      setMessage(err?.message || 'Unable to submit rating.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, comment, rating, router, userId]);

  return (
    <Screen safe>
      <AppHeader title="Rate your venue" />
      <View style={styles.container}>
        <Text variant="bodySmall" color={colors.textSecondary}>
          Tell us about your experience.
        </Text>
        {!canRate ? (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {message}
          </Text>
        ) : (
          <>
            <View style={styles.ratingRow}>
              {ratingOptions.map((value) => (
                <Chip
                  key={value}
                  label={`${value}`}
                  selected={rating === value}
                  onPress={() => setRating(value)}
                />
              ))}
            </View>
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
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
