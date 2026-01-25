import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Image, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../../components/ui/Text';
import { Screen } from '../../components/ui/Screen';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalListItem } from '../../components/portal/PortalListItem';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { Button } from '../../components/ui/Button';
import { usePortalOverview, usePortalRefresh } from '../../services/portal/portal.hooks';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

export function PortalHomeScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { overview, loading, error } = usePortalOverview();
  const { refreshing, onRefresh } = usePortalRefresh();
  const placeholder = t('portal.common.placeholder');

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

  if (loading && !overview) {
    return (
      <Screen>
        <SporHiveLoader />
      </Screen>
    );
  }

  if (error && !overview) {
    const isSessionMissing = String(error?.message || '').includes('PORTAL_TOKEN_MISSING');
    return (
      <Screen>
        <PortalEmptyState
          icon="alert-triangle"
          title={isSessionMissing ? t('portal.errors.sessionExpiredTitle') : t('portal.errors.overviewTitle')}
          description={isSessionMissing ? t('portal.errors.sessionExpiredDescription') : t('portal.errors.overviewDescription')}
          action={
            <Button
              size="small"
              onPress={() => {
                if (isSessionMissing) {
                  router.replace('/(auth)/login?mode=player');
                  return;
                }
                onRefresh();
              }}
            >
              {isSessionMissing ? t('portal.errors.sessionExpiredAction') : t('portal.common.retry')}
            </Button>
          }
        />
      </Screen>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }, isRTL && styles.rtl]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentOrange} />}
      showsVerticalScrollIndicator={false}
    >
      <PortalHeader title={t('portal.home.title')} subtitle={t('portal.home.subtitle')} />

      <PortalCard style={styles.card}>
        <View style={styles.identityRow}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated || colors.surface }]}
          >
            {overview?.player?.imageBase64 ? (
              <Image source={{ uri: overview.player.imageBase64 }} style={styles.avatarImage} />
            ) : (
              <Text variant="h3" weight="bold" color={colors.textPrimary}>
                {(overview?.player?.fullName || t('portal.common.player')).slice(0, 1)}
              </Text>
            )}
          </View>
          <View style={styles.identityText}>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {overview?.player?.fullName || t('portal.home.welcomeBack')}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {overview?.academyName || t('portal.home.academy')}
            </Text>
          </View>
        </View>
        <View style={styles.identityMeta}>
          <Text variant="caption" color={colors.textMuted}>
            {t('portal.home.registrationStatus')}
          </Text>
          <Text variant="bodySmall" color={colors.textPrimary}>
            {overview?.registration?.registration_type || t('portal.home.activePlayer')}
          </Text>
        </View>
      </PortalCard>

      <View style={styles.gridRow}>
        <PortalCard style={[styles.card, styles.gridCard]}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            {t('portal.home.registration')}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.cardSubtitle}>
            {overview?.registration?.groupName || t('portal.home.trainingGroup')}
          </Text>
          <Text variant="caption" color={colors.textMuted} style={styles.cardSubtitle}>
            {t('portal.home.courseLabel', { course: overview?.registration?.courseName || placeholder })}
          </Text>
        </PortalCard>
        <PortalCard style={[styles.card, styles.gridCard]}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            {t('portal.home.credits')}
          </Text>
          <Text variant="h3" weight="bold" color={colors.textPrimary} style={styles.metricValue}>
            {overview?.credits?.totalRemaining ?? 0}
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            {t('portal.home.nextExpiry', { date: overview?.credits?.nextExpiry || placeholder })}
          </Text>
        </PortalCard>
      </View>

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          {t('portal.home.sessionsProgress')}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.cardSubtitle}>
          {t('portal.home.sessionsRemaining', {
            remaining: overview?.registration?.remainingSessions ?? 0,
            total: overview?.registration?.totalSessions ?? 0,
          })}
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
              {t('portal.home.performanceScore')}
            </Text>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {overview?.performance?.metrics?.score || t('portal.home.performanceFallback')}
            </Text>
          </View>
          <View>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.home.attendance')}
            </Text>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {overview?.performance?.metrics?.attendance || t('portal.home.attendanceFallback')}
            </Text>
          </View>
        </View>
      </PortalCard>

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          {t('portal.home.upcomingPayments')}
        </Text>
        {paymentsPreview.length ? (
          <View style={styles.listStack}>
            {paymentsPreview.map((payment, index) => (
              <PortalListItem
                key={payment?.id ?? index}
                leadingIcon="credit-card"
                title={payment?.title || t('portal.home.invoice')}
                subtitle={t('portal.home.paymentDue', {
                  date: payment?.dueDate || t('portal.home.soon'),
                  status: payment?.status || t('portal.home.pending'),
                })}
                onPress={() => router.push('/portal/payments')}
              />
            ))}
          </View>
        ) : (
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.cardSubtitle}>
            {t('portal.home.noPendingInvoices')}
          </Text>
        )}
      </PortalCard>

      <View style={styles.quickGrid}>
        {[
          { label: t('portal.home.quick.profile'), icon: 'user', route: '/portal/(tabs)/profile' },
          { label: t('portal.home.quick.renewals'), icon: 'calendar', route: '/portal/(tabs)/renewals' },
          { label: t('portal.home.quick.freezes'), icon: 'pause-circle', route: '/portal/freezes' },
          { label: t('portal.home.quick.payments'), icon: 'credit-card', route: '/portal/payments' },
          { label: t('portal.home.quick.uniforms'), icon: 'shopping-bag', route: '/portal/uniform-store' },
          { label: t('portal.home.quick.performance'), icon: 'trending-up', route: '/portal/performance' },
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
              {t('portal.home.open')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rtl: {
    direction: 'rtl',
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
});
