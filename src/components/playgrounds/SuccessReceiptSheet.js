import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

const formatTimeRange = (booking) => {
  if (booking?.start_time && booking?.end_time) {
    return `${booking.start_time} - ${booking.end_time}`;
  }
  return booking?.start_time || booking?.end_time || booking?.time || 'TBD';
};

export const SuccessReceiptSheet = ({ booking }) => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);

  if (!booking) return null;
  const venueName = booking?.venue?.name || booking?.venue_name || booking?.venue || 'Venue';
  const academyName = booking?.academy?.public_name || booking?.academy_name || booking?.academy || 'Academy';

  return (
    <View style={[styles.sheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Booking Confirmed</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        Booking code #{booking?.booking_code || booking?.code || booking?.id || '—'}
      </Text>
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Venue: {venueName}
      </Text>
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Academy: {academyName}
      </Text>
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Date: {booking?.booking_date || booking?.date || 'TBD'}
      </Text>
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Time: {formatTimeRange(booking)}
      </Text>
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Duration: {booking?.duration?.minutes || booking?.duration_minutes || '—'} min
      </Text>
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Payment: {booking?.payment_type || booking?.payment_method || '—'}
      </Text>
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Status: {booking?.status || 'confirmed'}
      </Text>
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Amount: {booking?.amount || booking?.total_price || booking?.price || '—'} JOD
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 6,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  detail: {
    fontSize: 13,
    marginTop: 6,
  },
});
