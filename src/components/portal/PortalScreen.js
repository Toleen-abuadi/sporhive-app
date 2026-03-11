import React from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import { AppScreen } from '../ui/AppScreen';
import { AppHeader } from '../ui/AppHeader';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export function PortalScreen({ title, subtitle, rightAction, refreshing, onRefresh, scroll = true, children, contentContainerStyle }) {
  const { colors } = useTheme();
  const scrollProps = scroll
    ? {
      refreshControl: onRefresh
        ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accentOrange} />
        : undefined,
      showsVerticalScrollIndicator: false,
    }
    : null;

  return (
    <AppScreen
      safe
      scroll={scroll}
      noPadding
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...(scrollProps || {})}
    >
      {(title || subtitle) ? <AppHeader title={title} subtitle={subtitle} rightAction={rightAction} /> : null}
      {children}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'], gap: spacing.md },
});
