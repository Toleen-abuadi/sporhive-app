// API fields used: booking.date, booking.start_time, booking.end_time, booking.number_of_players,
// booking.status, booking.booking_code, booking.academy.public_name, booking.academy.location_text,
// booking.activity.name, booking.venue.name, booking.duration.minutes, booking.duration.base_price.
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goToRate } from '../../navigation/playgrounds.routes';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { usePlaygroundsAuth, usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { useBookingDetails } from '../../services/playgrounds/playgrounds.hooks';

const BookingActionSheet = ({
  visible,
  title,
  children,
  onClose,
}) => (
  <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.sheetOverlay}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>{title}</Text>
        {children}
      </View>
    </View>
  </Modal>
);

const formatTimeRange = (booking) => {
  if (booking?.start_time && booking?.end_time) {
    return `${booking.start_time} - ${booking.end_time}`;
  }
  return booking?.start_time || booking?.end_time || 'TBD';
};

export const PlaygroundsBookingDetailsScreen = () => {
  const { bookingId } = useLocalSearchParams();
  const router = useRouter();
  const playgrounds = usePlaygroundsStore();
  const { publicUserId } = usePlaygroundsAuth();
  const resolvedBookingId = Array.isArray(bookingId) ? bookingId[0] : bookingId;
  const { data: booking, loading, error } = useBookingDetails(resolvedBookingId);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [actionError, setActionError] = useState(null);

  const handleCancel = async () => {
    if (!publicUserId || !resolvedBookingId) return;
    const res = await playgroundsApi.cancelBooking({ booking_id: resolvedBookingId, user_id: publicUserId });
    if (!res?.success) {
      setActionError('Unable to cancel booking.');
    } else {
      setCancelOpen(false);
    }
  };

  const handleUpdate = async () => {
    if (!publicUserId || !resolvedBookingId) return;
    if (!newDate || !newTime) {
      setActionError('Select a new date and time.');
      return;
    }
    const res = await playgroundsApi.updateBooking({
      booking_id: resolvedBookingId,
      user_id: publicUserId,
      new_date: newDate,
      new_start_time: newTime,
    });
    if (!res?.success) {
      setActionError('Unable to update booking.');
    } else {
      setUpdateOpen(false);
    }
  };

  const handleFetchSlots = async () => {
    if (!booking?.venue?.id || !newDate) return;
    const res = await playgrounds.fetchSlots(booking?.venue?.id, {
      date: newDate,
      duration_minutes: booking?.duration?.minutes || 60,
    });
    if (!res?.success) {
      setActionError('Unable to load slots.');
      setSlots([]);
      return;
    }
    setSlots(Array.isArray(res.data) ? res.data : []);
  };

  const bookingDetails = useMemo(() => ({
    venue: booking?.venue?.name || 'Playground',
    academy: booking?.academy?.public_name || 'N/A',
    academyLocation: booking?.academy?.location_text || 'N/A',
    sport: booking?.activity?.name || 'N/A',
    date: booking?.date || 'TBD',
    time: formatTimeRange(booking),
    players: booking?.number_of_players ?? '—',
    total: booking?.duration?.base_price ?? '—',
    payment: booking?.payment_type || booking?.payment_method || '—',
    code: booking?.booking_code || '—',
    status: booking?.status || 'pending',
  }), [booking]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Booking Details</Text>
        {loading ? <Text style={styles.helper}>Loading...</Text> : null}
        {error ? <Text style={styles.error}>{error.message || 'Unable to load booking.'}</Text> : null}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {booking ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{bookingDetails.venue}</Text>
            <Text style={styles.cardMeta}>Academy: {bookingDetails.academy}</Text>
            <Text style={styles.cardMeta}>Location: {bookingDetails.academyLocation}</Text>
            <Text style={styles.cardMeta}>Sport: {bookingDetails.sport}</Text>
            <Text style={styles.cardMeta}>Date: {bookingDetails.date}</Text>
            <Text style={styles.cardMeta}>Time: {bookingDetails.time}</Text>
            <Text style={styles.cardMeta}>Players: {bookingDetails.players}</Text>
            <Text style={styles.cardMeta}>Payment: {bookingDetails.payment}</Text>
            <Text style={styles.cardMeta}>Code: {bookingDetails.code}</Text>
            <Text style={styles.cardMeta}>Status: {bookingDetails.status}</Text>
            <Text style={styles.total}>Total: {bookingDetails.total} JOD</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setUpdateOpen(true)}>
            <Text style={styles.secondaryButtonText}>Update Date/Time</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => goToRate(router)}>
            <Text style={styles.secondaryButtonText}>Rate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={() => setCancelOpen(true)}>
            <Text style={styles.dangerButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BookingActionSheet
        visible={cancelOpen}
        title="Cancel booking?"
        onClose={() => setCancelOpen(false)}
      >
        <Text style={styles.sheetText}>This action cannot be undone.</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleCancel}>
          <Text style={styles.dangerButtonText}>Confirm Cancel</Text>
        </TouchableOpacity>
      </BookingActionSheet>

      <BookingActionSheet
        visible={updateOpen}
        title="Update booking"
        onClose={() => setUpdateOpen(false)}
      >
        <TextInput
          placeholder="New date (YYYY-MM-DD)"
          value={newDate}
          onChangeText={setNewDate}
          style={styles.input}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={handleFetchSlots}>
          <Text style={styles.secondaryButtonText}>Load Slots</Text>
        </TouchableOpacity>
        {slots.length ? (
          <View style={styles.slotList}>
            {slots.map((slot) => {
              const slotLabel = slot?.start_time && slot?.end_time
                ? `${slot.start_time} - ${slot.end_time}`
                : slot?.start_time || slot?.end_time || 'Slot';
              return (
                <TouchableOpacity
                  key={slot.id || slotLabel}
                  style={[styles.slotChip, newTime === slot?.start_time && styles.slotChipActive]}
                  onPress={() => setNewTime(slot?.start_time)}
                >
                  <Text style={[styles.slotChipText, newTime === slot?.start_time && styles.slotChipTextActive]}>
                    {slotLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        <TouchableOpacity style={styles.primaryButton} onPress={handleUpdate}>
          <Text style={styles.primaryButtonText}>Update Booking</Text>
        </TouchableOpacity>
      </BookingActionSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11223A',
    marginBottom: 12,
  },
  helper: {
    fontSize: 12,
    color: '#6C7A92',
    marginBottom: 12,
  },
  error: {
    fontSize: 12,
    color: '#D64545',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#F7F9FF',
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
  },
  cardMeta: {
    fontSize: 12,
    color: '#6C7A92',
    marginTop: 6,
  },
  total: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11223A',
    marginTop: 12,
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: '#EFF3FF',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4F6AD7',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FCE8E8',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#D64545',
    fontWeight: '600',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sheetText: {
    fontSize: 12,
    color: '#6C7A92',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E6F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  slotList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F4FA',
  },
  slotChipActive: {
    backgroundColor: '#4F6AD7',
  },
  slotChipText: {
    fontSize: 12,
    color: '#6C7A92',
  },
  slotChipTextActive: {
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: '#4F6AD7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
