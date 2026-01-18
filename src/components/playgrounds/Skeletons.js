import { StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

export const VenueCardSkeleton = () => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.image, { backgroundColor: theme.colors.border }]} />
      <View style={styles.meta}>
        <View style={[styles.lineWide, { backgroundColor: theme.colors.border }]} />
        <View style={[styles.lineShort, { backgroundColor: theme.colors.border }]} />
        <View style={[styles.lineShort, { backgroundColor: theme.colors.border }]} />
      </View>
    </View>
  );
};

export const SectionSkeleton = () => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} />
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  image: {
    width: 96,
    height: 110,
    borderRadius: 16,
  },
  meta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  lineWide: {
    height: 14,
    borderRadius: 6,
    width: '80%',
  },
  lineShort: {
    height: 12,
    borderRadius: 6,
    width: '60%',
  },
  section: {
    height: 140,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 16,
  },
});
