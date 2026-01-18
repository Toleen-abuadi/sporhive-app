import React from 'react';
import { SafeAreaView, StyleSheet, View, ViewStyle } from 'react-native';
import { getColors, ThemeMode } from '../../theme/colors';

type ScreenProps = {
  children: React.ReactNode;
  mode?: ThemeMode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export function Screen({ children, mode = 'light', style, contentStyle }: ScreenProps) {
  const colors = getColors(mode);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }, style]}>
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
