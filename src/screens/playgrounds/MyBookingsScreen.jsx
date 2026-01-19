import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { endpoints } from '../../services/api/endpoints';
import { getPublicUser } from '../../services/playgrounds/storage';
import { BookingCard } from '../../components/playgrounds/BookingCard';
import { spacing } from '../../theme/tokens';

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

export function MyBookingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const publicUser = await getPublicUser();
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

  const counts = useMemo(() => {
    const base = STATUS_TABS.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
    items.forEach((item) => {
      const status = (item.status || 'pending').toLowerCase();
      base.all += 1;
      if (base[status] !== undefined) {
        base[status] += 1;
      }
    });
    return base;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeStatus === 'all') return items;
    return items.filter((item) => (item.status || '').toLowerCase() === activeStatus);
  }, [activeStatus, items]);

  return (
    <Screen safe>
      <AppHeader title="My bookings" />
      {!user?.id && !loading ? (
        <EmptyState
          title="Sign in required"
          message="Log in to view your playground bookings."
          actionLabel="Sign in"
          onAction={() => router.push('/playgrounds/auth')}
        />
      ) : loading ? (
        <View style={styles.loadingWrap}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`booking-skeleton-${index}`} height={140} style={{ marginBottom: spacing.md }} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Unable to load" message={error} onAction={loadBookings} />
      ) : (
        <>
          <View style={styles.filterRow}>
            {STATUS_TABS.map((status) => (
              <Chip
                key={status}
                label={`${status.charAt(0).toUpperCase()}${status.slice(1)} (${counts[status] || 0})`}
                selected={activeStatus === status}
                onPress={() => setActiveStatus(status)}
                accessibilityLabel={`Filter ${status}`}
              />
            ))}
          </View>
          {filteredItems.length ? (
            <FlatList
              data={filteredItems}
              keyExtractor={(item, index) => String(item.id ?? item.booking_id ?? index)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <BookingCard booking={item} onCancel={setCancelTarget} />
              )}
            />
          ) : (
            <EmptyState
              title="No bookings found"
              message="Try another status filter or explore venues."
              actionLabel="Explore"
              onAction={() => router.push('/playgrounds/explore')}
            />
          )}
        </>
      )}

      <BottomSheetModal visible={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        <View style={styles.cancelSheet}>
          <Text variant="h4" weight="semibold">
            Cancel booking?
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            Please contact support or the venue to confirm any cancellation policy.
          </Text>
          <View style={styles.cancelActions}>
            <Button variant="secondary" onPress={() => setCancelTarget(null)}>
              Keep booking
            </Button>
            <Button
              onPress={() => {
                setCancelTarget(null);
              }}
            >
              Got it
            </Button>
          </View>
        </View>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    padding: spacing.lg,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  cancelSheet: {
    gap: spacing.md,
  },
  cancelActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
