import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { TopBar } from '../../src/components/ui/TopBar';
import { Card } from '../../src/components/ui/Card';
import { Chip } from '../../src/components/ui/Chip';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { spacing, typography } from '../../src/theme/tokens';
import { getJson } from '../../src/services/storage/storage';
import { STORAGE_KEYS } from '../../src/services/storage/keys';
import { listMyBookings, type Booking } from '../../src/features/playgrounds/api/playgrounds.api';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export default function MyBookingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [hasRegisteredUser, setHasRegisteredUser] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadBookings = async () => {
      setLoading(true);
      try {
        const mode = await getJson<string>(STORAGE_KEYS.PUBLIC_USER_MODE);
        const user = await getJson<{ id: string }>(STORAGE_KEYS.PUBLIC_USER);
        if (!user?.id || mode !== 'registered') {
          if (isMounted) {
            setHasRegisteredUser(false);
            setBookings([]);
          }
          return;
        }
        if (isMounted) {
          setHasRegisteredUser(true);
        }
        const response = await listMyBookings({ user_id: user.id });
        if (isMounted) {
          setBookings(response);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void loadBookings();
    return () => {
      isMounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      all: bookings.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };
    bookings.forEach((booking) => {
      const status = booking.status?.toLowerCase() as StatusFilter;
      if (result[status] !== undefined) {
        result[status] += 1;
      }
    });
    return result;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter((booking) => booking.status?.toLowerCase() === statusFilter);
  }, [bookings, statusFilter]);

  return (
    <Screen>
      <TopBar title="My bookings" onBack={() => router.back()} />
      <View style={styles.container}>
        {!hasRegisteredUser ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.title}>Sign in to view bookings</Text>
            <Text style={styles.subtitle}>Access your bookings and manage changes.</Text>
            <PrimaryButton label="Sign in" onPress={() => router.push('/(playgrounds)/auth')} />
          </Card>
        ) : null}

        {hasRegisteredUser ? (
          <>
            <View style={styles.chipsRow}>
              {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as StatusFilter[]).map(
                (status) => (
                  <Chip
                    key={status}
                    label={`${status} (${counts[status] ?? 0})`}
                    selected={statusFilter === status}
                    onPress={() => setStatusFilter(status)}
                  />
                ),
              )}
            </View>

            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator />
              </View>
            ) : (
              <View style={styles.list}>
                {filteredBookings.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.title}>No bookings yet</Text>
                    <Text style={styles.subtitle}>Upcoming bookings will show here.</Text>
                  </Card>
                ) : (
                  filteredBookings.map((booking) => (
                    <Card key={booking.id} style={styles.bookingCard}>
                      <View style={styles.bookingHeader}>
                        <Text style={styles.codeText}>{booking.booking_code}</Text>
                        <View style={styles.statusPill}>
                          <Text style={styles.statusText}>{booking.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.bookingTitle}>{booking.venue.name}</Text>
                      <Text style={styles.bookingSubtitle}>{booking.academy.public_name}</Text>
                      <Text style={styles.bookingSubtitle}>
                        {booking.date} · {booking.start_time} - {booking.end_time}
                      </Text>
                      {booking.payment ? (
                        <Text style={styles.paymentText}>Payment recorded</Text>
                      ) : null}
                      <View style={styles.actionsRow}>
                        <PrimaryButton
                          label="Cancel booking"
                          onPress={() => setSelectedBooking(booking)}
                        />
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}
          </>
        ) : null}
      </View>

      <BottomSheet visible={Boolean(selectedBooking)} onClose={() => setSelectedBooking(null)}>
        <View style={styles.sheetContent}>
          <Text style={styles.title}>Need to cancel?</Text>
          <Text style={styles.subtitle}>
            Please contact the academy to cancel your booking or adjust timings.
          </Text>
          {selectedBooking?.academy.phone_number ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${selectedBooking.academy.phone_number}`)}
            >
              <Text style={styles.callText}>Call {selectedBooking.academy.phone_number}</Text>
            </Pressable>
          ) : null}
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  loadingState: {
    paddingVertical: spacing.xl,
  },
  emptyCard: {
    gap: spacing.sm,
  },
  bookingCard: {
    gap: spacing.xs,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
  },
  statusText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: '600',
    color: '#334155',
  },
  bookingTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
  },
  bookingSubtitle: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: '#475569',
  },
  paymentText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: '#64748B',
  },
  actionsRow: {
    marginTop: spacing.sm,
  },
  title: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  sheetContent: {
    gap: spacing.sm,
  },
  callText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '600',
    color: '#2563EB',
  },
});
