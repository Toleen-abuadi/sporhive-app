import { Image, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const VenueCard = ({ venue, onPress }) => {
  const scheme = useColorScheme();
  const colors = scheme === 'dark'
    ? ['#1F2338', '#141725']
    : ['#FFFFFF', '#F3F7FF'];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient colors={colors} style={styles.card}>
        <View style={styles.imageWrap}>
          {venue?.image ? (
            <Image source={{ uri: venue.image }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Playground</Text>
            </View>
          )}
        </View>
        <View style={styles.meta}>
          <Text style={styles.title}>{venue?.name || 'Premium Arena'}</Text>
          <Text style={styles.subtitle}>{venue?.city || 'Amman'} · {venue?.sport || 'Football'}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{venue?.rating || '4.8'}</Text>
            </View>
            <Text style={styles.price}>{venue?.price || '15 JOD / hr'}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 16,
    shadowColor: '#0B1A33',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  imageWrap: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E6EDF8',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 11,
    color: '#7A8BA8',
  },
  meta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
  },
  subtitle: {
    fontSize: 12,
    color: '#6C7A92',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  badge: {
    backgroundColor: '#E8F0FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#335AA6',
  },
  price: {
    fontSize: 12,
    color: '#2D3E5E',
    fontWeight: '600',
  },
});
