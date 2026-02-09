import React from 'react';
import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { AppScreen } from '../ui/AppScreen';
import { AppHeader } from '../ui/AppHeader';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export function PortalScreen({ title, subtitle, rightAction, refreshing, onRefresh, scroll = true, children, contentContainerStyle }) {
  const { colors } = useTheme();
  if (!scroll) {
    return (
      <AppScreen safe scroll={false}>
        {(title || subtitle) ? <AppHeader title={title} subtitle={subtitle} rightAction={rightAction} /> : null}
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      </AppScreen>
    );
  }
  return (
    <AppScreen safe scroll={false}>
      {(title || subtitle) ? <AppHeader title={title} subtitle={subtitle} rightAction={rightAction} /> : null}
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accentOrange} /> : undefined}
      >
        {children}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'], gap: spacing.md },
});
