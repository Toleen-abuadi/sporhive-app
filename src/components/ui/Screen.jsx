import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors } from '../../theme/colors';

export function Screen({ children, mode = 'light', style, contentStyle }) {
  const colors = getColors(mode);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }, style]} edges={['top', 'bottom']}>
      <View style={[styles.container, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
