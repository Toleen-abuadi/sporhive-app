import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

export const PaymentMethodCard = ({ title, subtitle, selected, onPress, disabled }) => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} disabled={disabled}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <View style={[styles.circle, { borderColor: theme.colors.primary }]}>
          {selected ? <View style={styles.circleInner} /> : null}
        </View>
        <View style={styles.meta}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
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
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  circleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF7A00',
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
});
