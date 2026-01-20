import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BackButton } from '../../components/ui/BackButton';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { endpoints } from '../../services/api/endpoints';
import { spacing } from '../../theme/tokens';

const CRITERIA = [
  { key: 'cleanliness', labelKey: 'service.playgrounds.rating.criteria.cleanliness' },
  { key: 'staff_service', labelKey: 'service.playgrounds.rating.criteria.staffService' },
  { key: 'field_quality', labelKey: 'service.playgrounds.rating.criteria.fieldQuality' },
  { key: 'booking_experience', labelKey: 'service.playgrounds.rating.criteria.bookingExperience' },
  { key: 'value_for_money', labelKey: 'service.playgrounds.rating.criteria.valueForMoney' },
  { key: 'safety_security', labelKey: 'service.playgrounds.rating.criteria.safetySecurity' },
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
  const { t } = useTranslation();
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
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const checkCanRate = useCallback(async () => {
    setCheckingEligibility(true);
    try {
      const res = await endpoints.playgrounds.ratingCanRate({
        booking_id: bookingId,
        user_id: userId,
      });
      const allowed = res?.can_rate ?? res?.data?.can_rate ?? true;
      if (!allowed) {
        setCanRate(false);
        setMessage(res?.message || t('service.playgrounds.rating.errors.alreadyRated'));
      }
    } catch (err) {
      setCanRate(false);
      setMessage(err?.message || t('service.playgrounds.rating.errors.verify'));
    } finally {
      setCheckingEligibility(false);
    }
  }, [bookingId, t, userId]);

  useEffect(() => {
    checkCanRate();
  }, [checkCanRate]);

  const handleSubmit = useCallback(async () => {
    if (!rating) {
      setMessage(t('service.playgrounds.rating.errors.overallRequired'));
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
      setMessage(err?.message || t('service.playgrounds.rating.errors.submit'));
    } finally {
      setLoading(false);
    }
  }, [bookingId, comment, criteria, rating, t, userId]);

  return (
    <Screen safe>
      <AppHeader title={t('service.playgrounds.rating.title')} leftSlot={<BackButton />} />
      {checkingEligibility ? (
        <SporHiveLoader message={t('service.playgrounds.rating.loading')} />
      ) : (
        <View style={styles.container}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t('service.playgrounds.rating.subtitle')}
          </Text>
          {!canRate ? (
            <Text variant="bodySmall" color={colors.textSecondary}>
              {message}
            </Text>
          ) : success ? (
            <View style={styles.successCard}>
              <Text variant="h4" weight="semibold">
                {t('service.playgrounds.rating.success.title')}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('service.playgrounds.rating.success.message')}
              </Text>
              <Button
                onPress={() => router.replace('/playgrounds/bookings')}
                accessibilityLabel={t('service.playgrounds.rating.actions.bookingsAccessibility')}
              >
                {t('service.playgrounds.rating.actions.bookings')}
              </Button>
            </View>
          ) : (
            <>
              <StarsRow
                label={t('service.playgrounds.rating.overall')}
                value={rating}
                onChange={setRating}
              />
              {CRITERIA.map((criterion) => (
                <StarsRow
                  key={criterion.key}
                  label={t(criterion.labelKey)}
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
                label={t('service.playgrounds.rating.comment.label')}
                value={comment}
                onChangeText={setComment}
                placeholder={t('service.playgrounds.rating.comment.placeholder')}
                accessibilityLabel={t('service.playgrounds.rating.comment.accessibility')}
              />
              {message ? (
                <Text variant="caption" color={colors.error}>
                  {message}
                </Text>
              ) : null}
              <Button
                onPress={handleSubmit}
                loading={loading}
                accessibilityLabel={t('service.playgrounds.rating.actions.submitAccessibility')}
              >
                {t('service.playgrounds.rating.actions.submit')}
              </Button>
            </>
          )}
        </View>
      )}
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
