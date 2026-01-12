import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Image, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../../components/ui/Text';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalListItem } from '../../components/portal/PortalListItem';
import { usePortalOverview, usePortalRefresh } from '../../services/portal/portal.hooks';
import { spacing } from '../../theme/tokens';

export function PortalHomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { overview, loading } = usePortalOverview();
  const { refreshing, onRefresh } = usePortalRefresh();

  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );

  const paymentsPreview = useMemo(() => {
    const list = Array.isArray(overview?.payments) ? overview.payments : [];
    return list.slice(0, 3);
  }, [overview?.payments]);

  const sessionProgress = overview?.registration?.totalSessions
    ? overview.registration.remainingSessions / overview.registration.totalSessions
    : 0.4;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentOrange} />}
      showsVerticalScrollIndicator={false}
    >
      <PortalHeader title="Player Portal" subtitle="Your personalised training hub" />

      <PortalCard style={styles.card}>
        <View style={styles.identityRow}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated || colors.surface }]}
          >
            {overview?.player?.imageBase64 ? (
              <Image source={{ uri: overview.player.imageBase64 }} style={styles.avatarImage} />
            ) : (
              <Text variant="h3" weight="bold" color={colors.textPrimary}>
                {(overview?.player?.fullName || 'Player').slice(0, 1)}
              </Text>
            )}
          </View>
          <View style={styles.identityText}>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {overview?.player?.fullName || 'Welcome back'}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {overview?.academyName || 'Your academy'}
            </Text>
          </View>
        </View>
        <View style={styles.identityMeta}>
          <Text variant="caption" color={colors.textMuted}>
            Registration status
          </Text>
          <Text variant="bodySmall" color={colors.textPrimary}>
            {overview?.registration?.registration_type || 'Active player'}
          </Text>
        </View>
      </PortalCard>

      <View style={styles.gridRow}>
        <PortalCard style={[styles.card, styles.gridCard]}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            Registration
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.cardSubtitle}>
            {overview?.registration?.groupName || 'Training group'}
          </Text>
          <Text variant="caption" color={colors.textMuted} style={styles.cardSubtitle}>
            Course: {overview?.registration?.courseName || '—'}
          </Text>
        </PortalCard>
        <PortalCard style={[styles.card, styles.gridCard]}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            Credits
          </Text>
          <Text variant="h3" weight="bold" color={colors.textPrimary} style={styles.metricValue}>
            {overview?.credits?.totalRemaining ?? 0}
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            Next expiry {overview?.credits?.nextExpiry || '—'}
          </Text>
        </PortalCard>
      </View>

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          Sessions progress
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.cardSubtitle}>
          {overview?.registration?.remainingSessions ?? 0} of {overview?.registration?.totalSessions ?? 0} sessions left
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.accentOrange,
                width: `${Math.min(Math.max(sessionProgress, 0), 1) * 100}%`,
              },
            ]}
          />
        </View>
        <View style={styles.metricRow}>
          <View>
            <Text variant="caption" color={colors.textMuted}>
              Performance score
            </Text>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {overview?.performance?.metrics?.score || '4.8'}
            </Text>
          </View>
          <View>
            <Text variant="caption" color={colors.textMuted}>
              Attendance
            </Text>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {overview?.performance?.metrics?.attendance || '92%'}
            </Text>
          </View>
        </View>
      </PortalCard>

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          Upcoming payments
        </Text>
        {paymentsPreview.length ? (
          <View style={styles.listStack}>
            {paymentsPreview.map((payment, index) => (
              <PortalListItem
                key={payment?.id ?? index}
                leadingIcon="credit-card"
                title={payment?.title || 'Invoice'}
                subtitle={`Due ${payment?.dueDate || 'soon'} • ${payment?.status || 'pending'}`}
                onPress={() => router.push('/portal/payments')}
              />
            ))}
          </View>
        ) : (
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.cardSubtitle}>
            No pending invoices yet.
          </Text>
        )}
      </PortalCard>

      <View style={styles.quickGrid}>
        {[
          { label: 'Profile', icon: 'user', route: '/portal/(tabs)/profile' },
          { label: 'Renewals', icon: 'calendar', route: '/portal/(tabs)/renewals' },
          { label: 'Freezes', icon: 'pause-circle', route: '/portal/freezes' },
          { label: 'Payments', icon: 'credit-card', route: '/portal/payments' },
          { label: 'Uniforms', icon: 'shopping-bag', route: '/portal/uniform-store' },
          { label: 'Performance', icon: 'trending-up', route: '/portal/performance' },
        ].map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(action.route)}
          >
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {action.label}
            </Text>
            <Text variant="caption" color={colors.textMuted} style={styles.quickSubtitle}>
              Open
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={[styles.skeletonCard, { backgroundColor: colors.border }]} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  identityText: {
    flex: 1,
  },
  identityMeta: {
    marginTop: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridCard: {
    flex: 1,
  },
  cardSubtitle: {
    marginTop: spacing.xs,
  },
  metricValue: {
    marginTop: spacing.md,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listStack: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
  },
  quickSubtitle: {
    marginTop: spacing.xs,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skeletonCard: {
    flex: 1,
    height: 80,
    borderRadius: 16,
  },
});
