import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api/endpoints';
import { spacing } from '../../theme/tokens';

export function RatingLinkResolverScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { token } = useLocalSearchParams();

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Resolving rating link...');
  const [bookingId, setBookingId] = useState(null);
  const [userId, setUserId] = useState(null);

  const resolveToken = useCallback(async () => {
    setStatus('loading');
    setMessage('Resolving rating link...');
    try {
      const res = await endpoints.playgrounds.ratingResolveToken(token);
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
      setMessage(payload?.message || 'This rating link is invalid or has expired.');
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'This rating link is invalid or has expired.');
    }
  }, [token]);

  useEffect(() => {
    resolveToken();
  }, [resolveToken]);

  return (
    <Screen safe>
      <View style={styles.container}>
        <Text variant="h4" weight="semibold">
          Rate your experience
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {message}
        </Text>
        {status === 'ready' && bookingId && userId ? (
          <Button
            onPress={() => router.replace(`/playgrounds/rate?bookingId=${bookingId}&userId=${userId}`)}
            accessibilityLabel="Continue to rating"
          >
            Continue
          </Button>
        ) : (
          <View style={styles.actions}>
            <Button onPress={() => router.replace('/playgrounds/explore')} accessibilityLabel="Back to explore">
              Back to explore
            </Button>
            <Button onPress={resolveToken} variant="secondary" accessibilityLabel="Retry rating link">
              Retry
            </Button>
          </View>
        )}
      </View>
    </Screen>
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
