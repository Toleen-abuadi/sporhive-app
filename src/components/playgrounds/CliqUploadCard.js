import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

export const CliqUploadCard = ({ uploading = false, onUpload, fileName }) => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: theme.colors.primarySoft }]} />
        <View style={styles.meta}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Upload CliQ Receipt</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Attach proof of payment to complete booking.
          </Text>
          {fileName ? (
            <Text style={[styles.fileName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              Selected: {fileName}
            </Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        onPress={onUpload}
        style={[
          styles.button,
          { backgroundColor: theme.colors.primary },
          uploading && styles.buttonDisabled,
        ]}
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
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    marginRight: 12,
  },
  meta: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  fileName: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  button: {
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
