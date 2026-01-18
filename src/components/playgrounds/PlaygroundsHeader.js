import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

export const PlaygroundsHeader = ({ title, subtitle, onRightPress, rightLabel }) => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.row}>
        <View style={styles.logoRow}>
          <View style={[styles.logoBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.logoMark}>S</Text>
          </View>
          <Text style={[styles.logoText, { color: theme.colors.textPrimary }]}>
            Spor<Text style={{ color: theme.colors.primary }}>Hive</Text>
          </Text>
        </View>
        {rightLabel ? (
          <TouchableOpacity
            onPress={onRightPress}
            style={[styles.rightButton, { borderColor: theme.colors.border }]}
          >
            <Text style={[styles.rightLabel, { color: theme.colors.textPrimary }]}>{rightLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {title ? (
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
  },
  rightButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 14,
  },
  rightLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
});
