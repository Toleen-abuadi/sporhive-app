import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const PaymentMethodCard = ({ title, subtitle, selected, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.card, selected && styles.cardSelected]}>
        <View style={styles.circle}>
          {selected ? <View style={styles.circleInner} /> : null}
        </View>
        <View style={styles.meta}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#0B1A33',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  cardSelected: {
    borderWidth: 1,
    borderColor: '#4F6AD7',
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4F6AD7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  circleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F6AD7',
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
});
