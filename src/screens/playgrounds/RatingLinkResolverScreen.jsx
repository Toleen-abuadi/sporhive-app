import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { BackButton } from '../../components/ui/BackButton';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { spacing } from '../../theme/tokens';

export function RatingLinkResolverScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useLocalSearchParams();

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState(() => t('service.playgrounds.ratingResolver.loading'));
  const [bookingId, setBookingId] = useState(null);
  const [userId, setUserId] = useState(null);

  const resolveToken = useCallback(async () => {
    setStatus('loading');
    setMessage(t('service.playgrounds.ratingResolver.loading'));
    try {
      const res = await playgroundsApi.resolveRatingToken(token);
      const payload = res?.data || res;
      const resolvedBookingId = payload?.booking_id || payload?.bookingId;
      const resolvedUserId = payload?.user_id || payload?.userId;
      if (resolvedBookingId && resolvedUserId) {
        setBookingId(String(resolvedBookingId));
        setUserId(String(resolvedUserId));
        setStatus('ready');
        return;
      }
      setStatus('error');
      setMessage(payload?.message || t('service.playgrounds.ratingResolver.invalid'));
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || t('service.playgrounds.ratingResolver.invalid'));
    }
  }, [t, token]);

  useEffect(() => {
    resolveToken();
  }, [resolveToken]);

  return (
    <AppScreen safe>
      <AppHeader title={t('service.playgrounds.ratingResolver.title')} leftSlot={<BackButton />} />
      {status === 'loading' ? (
        <SporHiveLoader message={t('service.playgrounds.ratingResolver.loading')} />
      ) : (
        <View style={styles.container}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {message}
          </Text>
          {status === 'ready' && bookingId && userId ? (
            <Button
              onPress={() => router.replace(`/playgrounds/rate?bookingId=${bookingId}&userId=${userId}`)}
              accessibilityLabel={t('service.playgrounds.ratingResolver.actions.continueAccessibility')}
            >
              {t('service.playgrounds.ratingResolver.actions.continue')}
            </Button>
          ) : (
            <View style={styles.actions}>
              <Button
                onPress={() => router.replace('/playgrounds/explore')}
                accessibilityLabel={t('service.playgrounds.ratingResolver.actions.backAccessibility')}
              >
                {t('service.playgrounds.ratingResolver.actions.back')}
              </Button>
              <Button
                onPress={resolveToken}
                variant="secondary"
                accessibilityLabel={t('service.playgrounds.ratingResolver.actions.retryAccessibility')}
              >
                {t('service.playgrounds.ratingResolver.actions.retry')}
              </Button>
            </View>
          )}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
