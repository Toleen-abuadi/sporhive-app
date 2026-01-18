// API fields used: booking.date, booking.start_time, booking.end_time, booking.number_of_players,
// booking.status, booking.booking_code, booking.academy.public_name, booking.academy.location_text,
// booking.activity.name, booking.venue.name, booking.duration.minutes, booking.duration.base_price.
import { useMemo, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PlaygroundsHeader } from '../../components/playgrounds/PlaygroundsHeader';
import { goToBookingDetails } from '../../navigation/playgrounds.routes';
import { useMyBookings } from '../../services/playgrounds/playgrounds.hooks';
import { usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

const statusTabs = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
];

const normalizeStatus = (status = '') => String(status || '').toLowerCase();

const formatTimeRange = (booking) => {
  if (booking?.start_time && booking?.end_time) {
    return `${booking.start_time} - ${booking.end_time}`;
  }
  return booking?.start_time || booking?.end_time || 'TBD';
};

export const PlaygroundsMyBookingsScreen = () => {
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);
  const playgrounds = usePlaygroundsStore();
  const { data, loading, error, load } = useMyBookings();
  const [activeStatus, setActiveStatus] = useState(statusTabs[0].key);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);

  const bookings = Array.isArray(data) ? data : [];

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => normalizeStatus(booking?.status) === activeStatus);
  }, [bookings, activeStatus]);

  const handleCancel = async (booking) => {
    const bookingId = booking?.id || booking?.booking_id;
    if (!bookingId) return;
    setCancelLoadingId(bookingId);
    const res = await playgrounds.cancelBooking({ booking_id: bookingId });
    setCancelLoadingId(null);
    if (res?.success) {
      load();
    }
  };

  const renderItem = ({ item }) => {
    const canCancel = Boolean(item?.can_cancel || item?.can_cancel_booking || item?.allow_cancel);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => goToBookingDetails(router, item.id || item.booking_id)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            {item?.venue?.name || item?.venue_name || 'Playground'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.primarySoft }]}>
            <Text style={[styles.statusText, { color: theme.colors.primary }]}>
              {item?.status || activeStatus}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]}>
          Academy: {item?.academy?.public_name || 'N/A'}
        </Text>
        <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]}>
          Location: {item?.academy?.location_text || 'N/A'}
        </Text>
        <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]}>
          Sport: {item?.activity?.name || 'N/A'}
        </Text>
        <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]}>Date: {item?.date || 'TBD'}</Text>
        <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]}>
          Time: {formatTimeRange(item)}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]}>
            Players: {item?.number_of_players ?? 'N/A'}
          </Text>
          <Text style={[styles.cardPrice, { color: theme.colors.primary }]}>
            {item?.duration?.base_price ?? '—'} JOD
          </Text>
        </View>
        <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]}>
          Code: {item?.booking_code || '—'}
        </Text>
        {canCancel ? (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.colors.border }]}
            onPress={() => handleCancel(item)}
            disabled={cancelLoadingId === (item?.id || item?.booking_id)}
          >
            <Text style={[styles.cancelText, { color: theme.colors.error }]}>
              {cancelLoadingId === (item?.id || item?.booking_id) ? 'Cancelling...' : 'Cancel booking'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <PlaygroundsHeader title="My bookings" subtitle="Track your upcoming sessions." />
      <View style={styles.tabsRow}>
        {statusTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabChip,
              {
                backgroundColor: activeStatus === tab.key ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setActiveStatus(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeStatus === tab.key ? '#FFFFFF' : theme.colors.textPrimary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <Text style={[styles.helper, { color: theme.colors.textMuted }]}>Loading bookings...</Text> : null}
      {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error.message || 'Unable to load bookings.'}</Text> : null}

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => String(item.id || item.booking_id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, filteredBookings.length === 0 && styles.emptyListContent]}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                No {activeStatus} bookings
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
                Try another status tab or book a new playground.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  helper: {
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  error: {
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  empty: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
