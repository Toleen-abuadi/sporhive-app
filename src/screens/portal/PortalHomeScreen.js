import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Image, RefreshControl, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../../components/ui/Text';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../services/auth/auth.store';
import { validatePortalSession } from '../../services/auth/portalSession';
import { useI18n } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { Badge } from '../../components/ui/Badge';
import { UserCircle, CreditCard, ShoppingBag, CalendarDays, RefreshCcw } from 'lucide-react-native';

export function PortalHomeScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const { session, logout, isLoading: authLoading } = useAuth();
  const {
    overview,
    overviewLoading,
    overviewError,
  } = usePlayerPortalStore((state) => ({
    overview: state.overview,
    overviewLoading: state.overviewLoading,
    overviewError: state.overviewError,
  }));
  const actions = usePlayerPortalActions();
  const [refreshing, setRefreshing] = useState(false);
  const placeholder = t('portal.common.placeholder');
  const sessionValidation = authLoading ? { ok: true } : validatePortalSession(session);

  const errorStatus =
    overviewError?.status ||
    overviewError?.response?.status ||
    overviewError?.statusCode ||
    overviewError?.meta?.status ||
    null;

  useEffect(() => {
    if (!authLoading && sessionValidation.ok) {
      actions.fetchOverview();
    }
  }, [actions, authLoading, sessionValidation.ok]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await actions.fetchOverview();
    setRefreshing(false);
  }, [actions]);

  const sessionProgress = overview?.registration?.totalSessions
    ? overview.registration.remainingSessions / overview.registration.totalSessions
    : 0.4;

  if ((overviewLoading || authLoading) && !overview) {
    return (
      <AppScreen safe>
        <View style={styles.skeletonStack}>
          <Skeleton height={120} radius={16} />
          <View style={styles.skeletonRow}>
            <Skeleton height={120} radius={16} style={styles.skeletonHalf} />
            <Skeleton height={120} radius={16} style={styles.skeletonHalf} />
          </View>
          <Skeleton height={160} radius={16} />
          <Skeleton height={140} radius={16} />
        </View>
      </AppScreen>
    );
  }

  const invalidSessionReason = !authLoading && !sessionValidation.ok ? sessionValidation.reason : null;

  if ((overviewError || invalidSessionReason) && !overview) {
    const isSessionInvalid = Boolean(invalidSessionReason || overviewError?.kind === 'PORTAL_SESSION_INVALID');
    const isForbidden = overviewError?.kind === 'PORTAL_FORBIDDEN' || errorStatus === 403;
    const isUnauthorized = errorStatus === 401;

    const titleKey = isSessionInvalid
      ? `portal.errors.${invalidSessionReason || 'sessionExpired'}Title`
      : isForbidden
      ? 'portal.errors.forbiddenTitle'
      : isUnauthorized
      ? 'portal.errors.unauthorizedTitle'
      : 'portal.errors.overviewTitle';
    const descriptionKey = isSessionInvalid
      ? `portal.errors.${invalidSessionReason || 'sessionExpired'}Description`
      : isForbidden
      ? 'portal.errors.forbiddenDescription'
      : isUnauthorized
      ? 'portal.errors.unauthorizedDescription'
      : 'portal.errors.overviewDescription';

    return (
      <AppScreen>
        <EmptyState
          title={t(titleKey)}
          message={t(descriptionKey)}
          actionLabel={
            isSessionInvalid || isForbidden || isUnauthorized
              ? t('portal.errors.reAuthAction')
              : t('portal.common.retry')
          }
          onAction={() => {
            if (isSessionInvalid || isForbidden || isUnauthorized) {
              logout().finally(() => {
                router.replace('/(auth)/login?mode=player');
              });
              return;
            }
            onRefresh();
          }}
        />
      </AppScreen>
    );
  }

  const sections = [
    {
      key: 'profile',
      title: t('portal.profile.title'),
      subtitle: t('portal.profile.subtitle'),
      icon: <UserCircle size={22} color={colors.accentOrange} />,
      route: '/portal/profile',
    },
    {
      key: 'renewals',
      title: t('portal.renewals.title'),
      subtitle: t('portal.renewals.subtitle'),
      icon: <RefreshCcw size={22} color={colors.accentOrange} />,
      route: '/portal/renewals',
    },
    {
      key: 'payments',
      title: t('portal.payments.title'),
      subtitle: t('portal.payments.subtitle'),
      icon: <CreditCard size={22} color={colors.accentOrange} />,
      route: '/portal/payments',
    },
    {
      key: 'orders',
      title: t('portal.orders.title'),
      subtitle: t('portal.orders.subtitle'),
      icon: <ShoppingBag size={22} color={colors.accentOrange} />,
      route: '/portal/my-orders',
    },
    {
      key: 'schedule',
      title: t('portal.schedule.title'),
      subtitle: t('portal.schedule.subtitle'),
      icon: <CalendarDays size={22} color={colors.accentOrange} />,
      route: '/portal/performance',
    },
  ];

  return (
    <PortalAccessGate titleOverride={t('portal.home.title')}>
      <AppScreen safe scroll={false} style={{ backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={[styles.content, isRTL && styles.rtl]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentOrange} />}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title={t('portal.home.title')}
            subtitle={t('portal.home.subtitle')}
            rightAction={{
              icon: <RefreshCcw size={18} color={colors.textPrimary} />,
              onPress: onRefresh,
              accessibilityLabel: t('portal.common.refresh'),
            }}
          />

          <Card style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.heroRow}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated || colors.surface }]}>
                {overview?.player?.imageBase64 ? (
                  <Image source={{ uri: overview.player.imageBase64 }} style={styles.avatarImage} />
                ) : (
                  <Text variant="h3" weight="bold" color={colors.textPrimary}>
                    {(overview?.player?.fullName || t('portal.common.player')).slice(0, 1)}
                  </Text>
                )}
              </View>
              <View style={styles.heroText}>
                <Text variant="h4" weight="bold" color={colors.textPrimary}>
                  {overview?.player?.fullName || t('portal.home.welcomeBack')}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {overview?.academyName || t('portal.home.academy')}
                </Text>
                <View style={styles.heroMetaRow}>
                  <Badge style={[styles.heroBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text variant="caption" weight="bold" color={colors.textPrimary}>
                      {overview?.registration?.registrationType || t('portal.home.activePlayer')}
                    </Text>
                  </Badge>
                  <Text variant="caption" color={colors.textMuted}>
                    {t('portal.home.playerId', { id: overview?.player?.id || placeholder })}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text variant="caption" color={colors.textMuted}>
                {t('portal.home.nextPayment')}
              </Text>
              <Text variant="body" weight="bold" color={colors.textPrimary}>
                {overview?.payments?.[0]?.amount || placeholder}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {overview?.payments?.[0]?.dueDate || placeholder}
              </Text>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text variant="caption" color={colors.textMuted}>
                {t('portal.home.sessionsRemainingShort')}
              </Text>
              <Text variant="body" weight="bold" color={colors.textPrimary}>
                {overview?.registration?.remainingSessions ?? 0}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {t('portal.home.ofSessions', { total: overview?.registration?.totalSessions ?? 0 })}
              </Text>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text variant="caption" color={colors.textMuted}>
                {t('portal.home.lastOrder')}
              </Text>
              <Text variant="body" weight="bold" color={colors.textPrimary}>
                {overview?.performance?.metrics?.last_order_status || placeholder}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {overview?.performance?.metrics?.last_order_date || placeholder}
              </Text>
            </Card>
          </View>

          <Card style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {t('portal.home.sessionsProgress')}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.cardSubtitle}>
              {t('portal.home.sessionsRemaining', {
                remaining: overview?.registration?.remainingSessions ?? 0,
                total: overview?.registration?.totalSessions ?? 0,
              })}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={{
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: colors.accentOrange,
                  width: `${Math.min(Math.max(sessionProgress, 0), 1) * 100}%`,
                }}
              />
            </View>
          </Card>

          <View style={styles.sectionHeader}>
            <Text variant="body" weight="bold" color={colors.textPrimary}>
              {t('portal.home.sections')}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {t('portal.home.sectionsSubtitle')}
            </Text>
          </View>

          <View style={styles.sectionGrid}>
            {sections.map((item) => (
              <Pressable key={item.key} onPress={() => router.push(item.route)}>
                <Card style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionIcon}>{item.icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="bold" color={colors.textPrimary}>
                      {item.title}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      {item.subtitle}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  rtl: {
    direction: 'rtl',
  },
  skeletonStack: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonHalf: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  progressCard: {
    marginTop: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.lg,
    gap: 10,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    gap: 4,
  },
  sectionGrid: {
    gap: spacing.md,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
  },
});
