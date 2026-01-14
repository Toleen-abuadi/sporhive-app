import { StyleSheet, Text, View } from 'react-native';

export const SuccessReceiptSheet = ({ booking }) => {
  if (!booking) return null;

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>Booking Confirmed</Text>
      <Text style={styles.subtitle}>Receipt #{booking?.id || '0001'}</Text>
      <View style={styles.divider} />
      <Text style={styles.detail}>Venue: {booking?.venue || 'Premium Arena'}</Text>
      <Text style={styles.detail}>Time: {booking?.time || '7:00 PM - 8:00 PM'}</Text>
      <Text style={styles.detail}>Amount: {booking?.amount || '15 JOD'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1A33',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
  },
  subtitle: {
    fontSize: 12,
    color: '#6C7A92',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EDF5',
    marginVertical: 12,
  },
  detail: {
    fontSize: 13,
    color: '#46556E',
    marginTop: 6,
  },
});
