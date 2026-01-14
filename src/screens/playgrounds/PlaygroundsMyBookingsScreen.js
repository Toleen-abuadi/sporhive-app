import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { goToBookingDetails } from '../../navigation/playgrounds.routes';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { usePlaygroundsAuth } from '../../services/playgrounds/playgrounds.store';

const statusTabs = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
];

const normalizeStatus = (status = '') => String(status || '').toLowerCase();

export const PlaygroundsMyBookingsScreen = () => {
  const router = useRouter();
  const { publicUserId } = usePlaygroundsAuth();
  const [activeStatus, setActiveStatus] = useState(statusTabs[0].key);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!publicUserId) return;
      setLoading(true);
      const res = await playgroundsApi.listBookings({ user_id: publicUserId });
      if (!active) return;
      if (!res?.success) {
        setError('Unable to load bookings.');
        setBookings([]);
      } else {
        setError(null);
        setBookings(Array.isArray(res.data) ? res.data : res.data?.items || []);
      }
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [publicUserId]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => normalizeStatus(booking?.status) === activeStatus);
  }, [bookings, activeStatus]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>My Bookings</Text>
        <View style={styles.tabsRow}>
          {statusTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, activeStatus === tab.key && styles.tabChipActive]}
              onPress={() => setActiveStatus(tab.key)}
            >
              <Text style={[styles.tabText, activeStatus === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <Text style={styles.helper}>Loading bookings...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {filteredBookings.length ? filteredBookings.map((booking) => (
          <TouchableOpacity
            key={booking.id || booking.booking_id}
            style={styles.card}
            onPress={() => goToBookingDetails(router, booking.id || booking.booking_id)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{booking?.venue_name || booking?.venue || 'Playground'}</Text>
              <Text style={styles.cardStatus}>{booking?.status || activeStatus}</Text>
            </View>
            <Text style={styles.cardMeta}>Date: {booking?.date || 'TBD'}</Text>
            <Text style={styles.cardMeta}>Time: {booking?.time || booking?.slot_time || 'TBD'}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardMeta}>Code: {booking?.code || booking?.booking_code || '—'}</Text>
              <Text style={styles.cardPrice}>{booking?.price || booking?.total_price || '—'} JOD</Text>
            </View>
            <Text style={styles.cardMeta}>Payment: {booking?.payment_method || booking?.payment_type || '—'}</Text>
          </TouchableOpacity>
        )) : (!loading && !error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No {activeStatus} bookings</Text>
            <Text style={styles.emptySubtitle}>Try another status tab.</Text>
          </View>
        ) : null)}
      </ScrollView>
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
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11223A',
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F4FA',
  },
  tabChipActive: {
    backgroundColor: '#4F6AD7',
  },
  tabText: {
    fontSize: 12,
    color: '#6C7A92',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
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
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#F7F9FF',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11223A',
  },
  cardStatus: {
    fontSize: 12,
    color: '#4F6AD7',
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 12,
    color: '#6C7A92',
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardPrice: {
    fontSize: 13,
    color: '#11223A',
    fontWeight: '700',
  },
  empty: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#F4F7FF',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6C7A92',
    marginTop: 6,
  },
});
