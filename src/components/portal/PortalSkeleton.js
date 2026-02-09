import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { spacing } from '../../theme/tokens';

export function PortalSkeleton({ rows = 3, height = 100 }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={`portal-skeleton-${i}`} height={height} radius={16} />)}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.md } });
