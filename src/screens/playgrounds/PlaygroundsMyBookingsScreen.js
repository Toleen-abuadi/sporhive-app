// Playgrounds bookings list with status tabs and navigation into booking details.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { playgroundsStore } from '../../services/playgrounds/playgrounds.store';
import { normalizeBookings } from '../../services/playgrounds/playgrounds.normalize';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
];

const normalizeStatus = (status) => String(status || '').toLowerCase();

function BookingCard({ booking, onPress }) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <Text variant="body" weight="bold">
          {booking?.venue_name || booking?.venue || 'Skyline Arena'}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
          <Text variant="caption" weight="bold" color={colors.accentOrange}>
            {booking?.status || 'Pending'}
          </Text>
        </View>
      </View>
      <Text variant="caption" color={colors.textMuted}>
        {booking?.date || booking?.booking_date || 'Sat, 12 Apr'} · {booking?.time || booking?.start_time || '7:30 PM'}
      </Text>
      <View style={styles.cardMeta}>
        <Text variant="caption" color={colors.textMuted}>
          Code: {booking?.booking_code || booking?.code || '—'}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          {booking?.payment_method || booking?.payment_type || 'Cash'}
        </Text>
      </View>
      <View style={styles.cardFooter}>
        <Text variant="bodySmall" weight="semibold" color={colors.textPrimary}>
          {booking?.price || booking?.total_price || 'AED 240'}
        </Text>
      </View>
    </Pressable>
  );
}

export function PlaygroundsMyBookingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [checkingIdentity, setCheckingIdentity] = useState(true);

  useEffect(() => {
    let mounted = true;
    playgroundsStore.getPublicUserId().then((publicUserId) => {
      if (!mounted) return;
      if (!publicUserId) {
        router.replace('/playgrounds/identify');
      }
      setCheckingIdentity(false);
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    const userId = await playgroundsStore.getPublicUserId();
    const response = await playgroundsApi.listBookings({ user_id: userId });
    if (!response?.success) {
      setError(response?.error?.message || 'We could not load your bookings right now.');
    }
    const data = response?.success ? normalizeBookings(response.data) : [];
    setBookings(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const statusKey = normalizeStatus(activeStatus);
    return bookings.filter((booking) => normalizeStatus(booking?.status) === statusKey);
  }, [bookings, activeStatus]);

  const counts = useMemo(() => {
    return STATUS_TABS.reduce((acc, tab) => {
      acc[tab.key] = bookings.filter((booking) => normalizeStatus(booking?.status) === tab.key).length;
      return acc;
    }, {});
  }, [bookings]);

  if (checkingIdentity) {
    return (
      <Screen>
        <LoadingState message="Preparing your bookings..." />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Animated.FlatList
        data={filteredBookings}
        keyExtractor={(item, index) => item.id?.toString?.() || `booking-${index}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadBookings();
        }} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="h3" weight="bold">
              My bookings
            </Text>
            <Text variant="body" color={colors.textSecondary}>
              Track every booking and receipt in one place.
            </Text>

            <View style={styles.tabsRow}>
              {STATUS_TABS.map((tab) => {
                const active = tab.key === activeStatus;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveStatus(tab.key)}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: active ? colors.accentOrange : colors.surface,
                        borderColor: active ? colors.accentOrange : colors.border,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="semibold" color={active ? colors.white : colors.textPrimary}>
                      {tab.label}
                    </Text>
                    <Text variant="caption" color={active ? colors.white : colors.textMuted}>
                      {counts[tab.key] || 0}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(240)} layout={Layout.springify()}>
            <BookingCard
              booking={item}
              onPress={() =>
                router.push({
                  pathname: '/playgrounds/booking/[bookingId]',
                  params: { bookingId: String(item.id || item.booking_id), booking: JSON.stringify(item) },
                })
              }
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          loading ? (
            <LoadingState message="Loading your bookings..." />
          ) : error ? (
            <EmptyState
              title="Unable to load bookings"
              message={error}
              actionLabel="Retry"
              onAction={loadBookings}
            />
          ) : (
            <EmptyState
              title="No bookings yet"
              message="Your confirmed games will appear here."
              actionLabel="Explore venues"
              onAction={() => router.push('/playgrounds')}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
