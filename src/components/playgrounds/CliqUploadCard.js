import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const CliqUploadCard = ({ uploading = false, onUpload }) => {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.badge} />
        <View style={styles.meta}>
          <Text style={styles.title}>Upload CliQ Receipt</Text>
          <Text style={styles.subtitle}>Attach proof of payment to complete booking.</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onUpload}
        style={[styles.button, uploading && styles.buttonDisabled]}
        disabled={uploading}
      >
        <Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Choose File'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F8FAFF',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E0E8FF',
    marginRight: 12,
  },
  meta: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11223A',
  },
  subtitle: {
    fontSize: 12,
    color: '#6C7A92',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#4F6AD7',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
