import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { endpoints } from '../../services/api/endpoints';
import { getPublicUser } from '../../services/playgrounds/storage';
import { Booking, PublicUser } from '../../services/playgrounds/types';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

function formatMoney(amount?: number | null, currency?: string | null) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${Number(amount).toFixed(0)}`;
}

export function MyBookingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const publicUser = await getPublicUser<PublicUser>();
      setUser(publicUser);
      if (!publicUser?.id) {
        setLoading(false);
        return;
      }
      const res = await endpoints.playgrounds.listBookings({ user_id: publicUser.id });
      const list = Array.isArray(res?.bookings)
        ? res.bookings
        : Array.isArray(res?.data?.bookings)
        ? res.data.bookings
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setItems(list);
    } catch (err) {
      setError(err?.message || 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  return (
    <Screen safe>
      <AppHeader title="My bookings" />
      {loading ? (
        <LoadingState message="Loading your bookings..." />
      ) : !user?.id ? (
        <EmptyState
          title="Sign in required"
          message="Log in to view your playground bookings."
          actionLabel="Sign in"
          onAction={() => router.push('/playgrounds/auth')}
        />
      ) : error ? (
        <ErrorState title="Unable to load" message={error} onAction={loadBookings} />
      ) : items.length ? (
        <FlatList
          data={items}
          keyExtractor={(item, index) => String(item.id ?? item.booking_id ?? index)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {item.booking_code || item.id}
              </Text>
              <Text variant="bodySmall" weight="semibold">
                {item.venue?.name || item.venue?.title || 'Playground'} • {item.booking_date || item.date}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {formatMoney(item.total || (item.total_price ? Number(item.total_price) : null), item.currency)}
              </Text>
            </View>
          )}
        />
      ) : (
        <EmptyState
          title="No bookings yet"
          message="Explore venues and book your first playground session."
          actionLabel="Explore"
          onAction={() => router.push('/playgrounds/explore')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    ...shadows.sm,
  },
});
