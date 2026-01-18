import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../src/components/ui/Screen';
import { TopBar } from '../../../src/components/ui/TopBar';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { resolveRatingToken } from '../../../src/features/playgrounds/api/playgrounds.api';
import { getErrorMessage, isNetworkError } from '../../../src/features/playgrounds/utils';
import { spacing, typography } from '../../../src/theme/tokens';

export default function RatingResolverScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNetworkFailure, setIsNetworkFailure] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleResolve = useCallback(async () => {
    const resolvedToken = Array.isArray(token) ? token[0] : token;
    if (!resolvedToken) {
      setErrorMessage('Missing rating token.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setIsNetworkFailure(false);
    try {
      const response = await resolveRatingToken(resolvedToken);
      const bookingId = typeof response.booking_id === 'string' ? response.booking_id : null;
      const userId = typeof response.user_id === 'string' ? response.user_id : null;
      if (bookingId && userId) {
        router.replace(`/(playgrounds)/rate?booking_id=${bookingId}&user_id=${userId}`);
        return;
      }
      setErrorMessage('Unable to resolve rating request.');
    } catch (error) {
      if (isNetworkError(error)) {
        setIsNetworkFailure(true);
        setErrorMessage(getErrorMessage(error, 'Network error. Please try again.'));
      } else {
        setErrorMessage(getErrorMessage(error, 'Unable to resolve rating request.'));
      }
    } finally {
      setLoading(false);
    }
  }, [router, token]);

  useEffect(() => {
    void handleResolve();
  }, [handleResolve, retryKey]);

  if (loading) {
    return (
      <Screen>
        <TopBar title="Resolve rating" onBack={() => router.replace('/(playgrounds)')} />
        <View style={styles.container}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={18} width="80%" />
          <Skeleton height={44} width={160} radius={16} />
        </View>
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen>
        <TopBar title="Resolve rating" onBack={() => router.replace('/(playgrounds)')} />
        <View style={styles.container}>
          <Text style={styles.title}>We couldn't open your rating</Text>
          <Text style={styles.subtitle}>{errorMessage}</Text>
          {isNetworkFailure ? (
            <PrimaryButton label="Retry" onPress={() => setRetryKey((prev) => prev + 1)} />
          ) : null}
          <PrimaryButton label="Back to Explore" onPress={() => router.replace('/(playgrounds)')} />
        </View>
      </Screen>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
