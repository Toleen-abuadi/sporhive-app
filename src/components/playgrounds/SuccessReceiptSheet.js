import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

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
        Receipt #{booking?.id || '0001'}
      </Text>
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Venue: {booking?.venue || 'Premium Arena'}
      </Text>
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Time: {booking?.time || '7:00 PM - 8:00 PM'}
      </Text>
      <Text style={[styles.detail, { color: theme.colors.textPrimary }]}>
        Amount: {booking?.amount || '15 JOD'}
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
