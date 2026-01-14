// Playgrounds booking detail view with update/cancel management flows.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { playgroundsStore } from '../../services/playgrounds/playgrounds.store';
import { normalizeBookings } from '../../services/playgrounds/playgrounds.normalize';
import { goToMyBookings } from '../../navigation/playgrounds.routes';

const formatDate = (date) => date.toISOString().split('T')[0];

function DetailRow({ label, value }) {
  const { colors } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text variant="caption" color={colors.textMuted}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="semibold">
        {value}
      </Text>
    </View>
  );
}

export function PlaygroundsBookingDetailsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const bookingId = params?.bookingId || params?.id || null;
  const bookingParam = typeof params?.booking === 'string' ? params.booking : null;
  const [booking, setBooking] = useState(() => {
    if (!bookingParam) return null;
    try {
      return JSON.parse(bookingParam);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!booking);
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [newTime, setNewTime] = useState(new Date());
  const [checkingIdentity, setCheckingIdentity] = useState(true);

  const userIdPromise = useMemo(() => playgroundsStore.getPublicUserId(), []);

  useEffect(() => {
    let mounted = true;
    userIdPromise.then((publicUserId) => {
      if (!mounted) return;
      if (!publicUserId) {
        router.replace('/playgrounds/identify');
      }
      setCheckingIdentity(false);
    });
    return () => {
      mounted = false;
    };
  }, [router, userIdPromise]);

  const loadBooking = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    const userId = await userIdPromise;
    const response = await playgroundsApi.listBookings({ user_id: userId });
    if (!response?.success) {
      setError(response?.error?.message || 'Failed to load booking.');
      setLoading(false);
      return;
    }
    const list = normalizeBookings(response.data);
    const match = list.find((item) => String(item.id || item.booking_id) === String(bookingId));
    setBooking(match || null);
    setLoading(false);
  }, [bookingId, userIdPromise]);

  useEffect(() => {
    if (!booking) {
      loadBooking();
    }
  }, [booking, loadBooking]);

  const handleCancel = async () => {
    setError('');
    setMessage('');
    const userId = await userIdPromise;
    const response = await playgroundsApi.cancelBooking({ booking_id: bookingId, user_id: userId });
    if (!response?.success) {
      setError(response?.error?.message || 'Could not cancel booking.');
      return;
    }
    setMessage('Booking cancelled successfully.');
    setConfirmCancel(false);
    await loadBooking();
  };

  const handleUpdate = async () => {
    if (!booking) return;
    setError('');
    setMessage('');
    setCheckingSlots(true);
    const dateValue = formatDate(newDate);
    const timeValue = newTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const slotsResponse = await playgroundsApi.fetchSlots({
      venue_id: booking?.venue_id || booking?.venueId,
      date: dateValue,
      duration_minutes: booking?.duration_minutes || booking?.duration || booking?.duration_minutes,
    });
    const slots = slotsResponse?.success ? slotsResponse.data?.slots || slotsResponse.data || [] : [];
    const hasSlot = slots.some((slot) => {
      const slotTime = slot.start_time || slot.time || slot.label;
      return slotTime === timeValue;
    });
    setCheckingSlots(false);

    if (!hasSlot) {
      setError('Selected time is no longer available. Please choose another.');
      return;
    }

    setUpdating(true);
    const userId = await userIdPromise;
    const response = await playgroundsApi.updateBooking({
      booking_id: bookingId,
      user_id: userId,
      new_date: dateValue,
      new_start_time: timeValue,
    });
    setUpdating(false);

    if (!response?.success) {
      setError(response?.error?.message || 'Could not update booking.');
      return;
    }

    setMessage('Booking updated successfully.');
    setShowUpdate(false);
    await loadBooking();
  };

  if (checkingIdentity) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accentOrange} />
          <Text variant="body" color={colors.textSecondary}>
            Preparing your booking...
          </Text>
        </View>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accentOrange} />
          <Text variant="body" color={colors.textSecondary}>
            Loading booking details...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!booking) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <Text variant="body" color={colors.textSecondary}>
            Booking not found.
          </Text>
          <Button onPress={loadBooking} variant="secondary">
            Retry
          </Button>
          <Button onPress={() => goToMyBookings(router)}>
            Back to bookings
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text variant="h3" weight="bold">
          {booking?.venue_name || booking?.venue || 'Venue'}
        </Text>
        <Text variant="body" color={colors.textSecondary}>
          Booking code: {booking?.booking_code || booking?.code || '—'}
        </Text>
        {message ? (
          <Text variant="bodySmall" color={colors.accentOrange}>
            {message}
          </Text>
        ) : null}
        {error ? (
          <Text variant="bodySmall" color={colors.error}>
            {error}
          </Text>
        ) : null}
        <View style={[styles.detailsCard, { borderColor: colors.border }]}>
          <DetailRow label="Date" value={booking?.date || booking?.booking_date || '—'} />
          <DetailRow label="Time" value={booking?.time || booking?.start_time || '—'} />
          <DetailRow label="Players" value={booking?.players_count || booking?.players || '—'} />
          <DetailRow label="Duration" value={booking?.duration_minutes ? `${booking.duration_minutes} min` : '—'} />
          <DetailRow label="Payment" value={booking?.payment_method || booking?.payment_type || '—'} />
          <DetailRow label="Total" value={booking?.total_price || booking?.price || 'AED 0'} />
          <DetailRow label="Status" value={booking?.status || '—'} />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Button
          variant="secondary"
          onPress={() => router.push({ pathname: '/playgrounds/rate', params: { bookingId: String(bookingId) } })}
          style={styles.actionButton}
        >
          Rate booking
        </Button>
        <Button variant="secondary" onPress={() => setShowUpdate(true)} style={styles.actionButton}>
          Update booking
        </Button>
        <Button variant="danger" onPress={() => setConfirmCancel(true)} style={styles.actionButton}>
          Cancel booking
        </Button>
      </View>

      <BottomSheetModal visible={confirmCancel} onClose={() => setConfirmCancel(false)}>
        <View style={styles.modalContent}>
          <Text variant="h4" weight="bold">
            Cancel booking?
          </Text>
          <Text variant="body" color={colors.textSecondary}>
            This action cannot be undone. You&apos;ll lose your reserved slot.
          </Text>
          <View style={styles.modalActions}>
            <Button variant="secondary" onPress={() => setConfirmCancel(false)} style={styles.modalButton}>
              Keep booking
            </Button>
            <Button variant="danger" onPress={handleCancel} style={styles.modalButton}>
              Confirm cancel
            </Button>
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal visible={showUpdate} onClose={() => setShowUpdate(false)}>
        <View style={styles.modalContent}>
          <Text variant="h4" weight="bold">
            Update booking
          </Text>
          <Text variant="bodySmall" color={colors.textMuted}>
            Select a new date and start time. We&apos;ll check availability before updating.
          </Text>
          <DateTimePicker
            value={newDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => date && setNewDate(date)}
          />
          <DateTimePicker
            value={newTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, time) => time && setNewTime(time)}
          />
          {checkingSlots ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accentOrange} />
              <Text variant="caption" color={colors.textMuted}>
                Checking availability...
              </Text>
            </View>
          ) : null}
          <View style={styles.modalActions}>
            <Button variant="secondary" onPress={() => setShowUpdate(false)} style={styles.modalButton}>
              Close
            </Button>
            <Button onPress={handleUpdate} loading={updating} style={styles.modalButton}>
              Confirm update
            </Button>
          </View>
        </View>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  detailsCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  modalContent: {
    gap: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
