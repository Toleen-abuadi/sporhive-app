import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

export const StickyFooterCTA = ({
  priceLabel,
  priceValue,
  buttonLabel,
  onPress,
  disabled,
  helperText,
}) => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View>
        <Text style={[styles.priceLabel, { color: theme.colors.textMuted }]}>{priceLabel}</Text>
        <Text style={[styles.priceValue, { color: theme.colors.primary }]}>{priceValue}</Text>
        {helperText ? (
          <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>{helperText}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.button,
          { backgroundColor: theme.colors.primary, opacity: disabled ? 0.6 : 1 },
        ]}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  helperText: {
    fontSize: 11,
    marginTop: 2,
  },
  button: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
