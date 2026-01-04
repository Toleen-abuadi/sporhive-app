import React from 'react';
import { View, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export function Screen({ children, scroll = false, safe = true, style, contentContainerStyle }) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (safe) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {content}
      </SafeAreaView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});
