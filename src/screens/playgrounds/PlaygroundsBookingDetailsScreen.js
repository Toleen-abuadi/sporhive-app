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
import { usePlaygroundsAuth } from '../../services/playgrounds/playgrounds.store';

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

export const PlaygroundsBookingDetailsScreen = () => {
  const { bookingId } = useLocalSearchParams();
  const router = useRouter();
  const { publicUserId } = usePlaygroundsAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [slots, setSlots] = useState([]);

  const resolvedBookingId = Array.isArray(bookingId) ? bookingId[0] : bookingId;

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!publicUserId) return;
      setLoading(true);
      const res = await playgroundsApi.listBookings({ user_id: publicUserId });
      if (!active) return;
      if (!res?.success) {
        setError('Unable to load booking.');
        setBooking(null);
      } else {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        const found = list.find((item) => String(item.id || item.booking_id) === String(resolvedBookingId));
        setBooking(found || null);
        setError(null);
      }
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [publicUserId, resolvedBookingId]);

  const handleCancel = async () => {
    if (!publicUserId || !resolvedBookingId) return;
    setLoading(true);
    const res = await playgroundsApi.cancelBooking({ booking_id: resolvedBookingId, user_id: publicUserId });
    if (!res?.success) {
      setError('Unable to cancel booking.');
    } else {
      setBooking((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
      setCancelOpen(false);
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!publicUserId || !resolvedBookingId) return;
    if (!newDate || !newTime) {
      setError('Select a new date and time.');
      return;
    }
    setLoading(true);
    const res = await playgroundsApi.updateBooking({
      booking_id: resolvedBookingId,
      user_id: publicUserId,
      new_date: newDate,
      new_start_time: newTime,
    });
    if (!res?.success) {
      setError('Unable to update booking.');
    } else {
      setBooking((prev) => prev ? { ...prev, date: newDate, time: newTime } : prev);
      setUpdateOpen(false);
    }
    setLoading(false);
  };

  const handleFetchSlots = async () => {
    if (!booking?.venue_id || !newDate) return;
    const res = await playgroundsApi.fetchSlots({
      venue_id: booking?.venue_id,
      date: newDate,
      duration_minutes: booking?.duration_minutes || 60,
    });
    if (!res?.success) {
      setError('Unable to load slots.');
      setSlots([]);
      return;
    }
    setSlots(res.data || []);
  };

  const bookingDetails = useMemo(() => ({
    venue: booking?.venue_name || booking?.venue || 'Playground',
    date: booking?.date || 'TBD',
    time: booking?.time || booking?.slot_time || 'TBD',
    players: booking?.players || booking?.players_count || '—',
    total: booking?.total_price || booking?.price || '—',
    payment: booking?.payment_method || booking?.payment_type || '—',
    code: booking?.code || booking?.booking_code || '—',
    status: booking?.status || 'pending',
  }), [booking]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Booking Details</Text>
        {loading ? <Text style={styles.helper}>Loading...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {booking ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{bookingDetails.venue}</Text>
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
            {slots.map((slot) => (
              <TouchableOpacity
                key={slot.id || slot.time}
                style={[styles.slotChip, newTime === (slot.time || slot.label) && styles.slotChipActive]}
                onPress={() => setNewTime(slot.time || slot.label)}
              >
                <Text style={[styles.slotChipText, newTime === (slot.time || slot.label) && styles.slotChipTextActive]}>
                  {slot.label || slot.time}
                </Text>
              </TouchableOpacity>
            ))}
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
    marginTop: 20,
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
    backgroundColor: '#FFECEE',
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
    backgroundColor: 'rgba(10, 18, 36, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    flex: 1,
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
    color: '#11223A',
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  slotList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  slotChip: {
    paddingHorizontal: 12,
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
    fontWeight: '600',
  },
});
