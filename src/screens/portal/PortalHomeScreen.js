import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, RefreshControl, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { UserCircle, CreditCard, ShoppingBag, RefreshCcw, Shirt, ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../../components/ui/Text';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../services/auth/auth.store';
import { validatePortalSession } from '../../services/auth/portalSession';
import { useI18n } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { Badge } from '../../components/ui/Badge';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { ThemedLoader } from '../../components/ui/ThemedLoader';

const parseDaysLeft = (dateText) => {
  if (!dateText) return null;
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
};

export function PortalHomeScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const { session, ensurePortalReauthOnce, isLoading: authLoading } = useAuth();
  const { overview, overviewLoading, overviewError } = usePlayerPortalStore((state) => ({
    overview: state.overview,
    overviewLoading: state.overviewLoading,
    overviewError: state.overviewError,
  }));
  const actions = usePlayerPortalActions();
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const reauthHandledRef = useRef(false);
  const didReauthRedirectRef = useRef(false);
  const placeholder = t('portal.common.placeholder');
  const sessionValidation = authLoading ? { ok: true } : validatePortalSession(session);

  // keep latest function without depending on the whole actions object
  const fetchOverviewRef = useRef(null);
  const autoFetchOnceRef = useRef(false);

  useEffect(() => {
    fetchOverviewRef.current = actions.fetchOverview;
  }, [actions.fetchOverview]);

  useEffect(() => {
    if (authLoading) return;
    if (!sessionValidation.ok) return;
    if (overview || overviewLoading) return; // prevent spamming
    if (overviewError) return; // block auto-retry loop after failure
    if (autoFetchOnceRef.current) return; // ✅ extra safety: only auto-fetch once per mount
    autoFetchOnceRef.current = true;
   if (__DEV__) {
      console.trace('[TRACE] PortalHomeScreen useEffect ACTUALLY calling fetchOverview', {
        overview: !!overview,
        overviewLoading,
        hasError: !!overviewError,
      });
    }
    fetchOverviewRef.current?.();
  }, [authLoading, sessionValidation.ok, overview, overviewLoading, overviewError]);


  const onRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    if (__DEV__) console.trace('[TRACE] onRefresh called (force=true)');
    setRefreshing(true);
    try {
      await actions.fetchOverview({ force: true });
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [actions.fetchOverview]);

  const handleReauthRequired = useCallback(async () => {
    if (reauthHandledRef.current || didReauthRedirectRef.current) return;
    reauthHandledRef.current = true;
    const res = await ensurePortalReauthOnce?.();
    if (res?.success) {
      reauthHandledRef.current = false;
      onRefresh();
      return;
    }
    didReauthRedirectRef.current = true;
    router.replace('/(auth)/login?mode=player');
  }, [ensurePortalReauthOnce, onRefresh, router]);

  const errorStatus = overviewError?.status || overviewError?.response?.status || overviewError?.statusCode || null;
  const invalidSessionReason = !authLoading && !sessionValidation.ok ? sessionValidation.reason : null;
  const isSessionInvalid = Boolean(invalidSessionReason || overviewError?.kind === 'PORTAL_SESSION_INVALID' || errorStatus === 401);

  if ((overviewLoading || authLoading) && !overview) {
    return (
      <AppScreen safe>
        <ThemedLoader label={t('common.loading')} />
      </AppScreen>
    );
  }

  if ((overviewError || invalidSessionReason) && !overview && !isSessionInvalid) {
    return (
      <AppScreen>
        <EmptyState
          title={t('portal.errors.overviewTitle')}
          message={overviewError?.message || t('portal.errors.overviewDescription')}
          actionLabel={t('portal.common.retry')}
          onAction={onRefresh}
        />
      </AppScreen>
    );
  }

  const firstPayment = overview?.payments?.[0] || null;
  const paymentStatus = String(firstPayment?.status || '').toLowerCase();
  const hasUnpaid = paymentStatus.includes('unpaid') || paymentStatus.includes('pending') || paymentStatus.includes('overdue');
  const renewalDays = parseDaysLeft(overview?.registration?.endDate || overview?.renewals?.end_date);
  const renewalUrgent = renewalDays != null && renewalDays <= 14;
  const freezePending = Number(overview?.performance?.metrics?.freezing_counts?.pending || 0) > 0;

  const actionConfig = hasUnpaid
    ? {
      title: t('portal.common.actionRequired'),
      description: t('portal.home.action.paymentDue', { date: firstPayment?.dueDate || placeholder }),
      cta: t('portal.home.action.payNow'),
      route: '/portal/payments',
    }
    : renewalUrgent
      ? {
        title: t('portal.common.actionRequired'),
        description: t('portal.home.action.renewalRecommended', { days: Math.max(renewalDays, 0) }),
        cta: t('portal.home.action.renewNow'),
        route: '/portal/renewals',
      }
      : freezePending
        ? {
          title: t('portal.common.actionRequired'),
          description: t('portal.home.action.pendingFreeze'),
          cta: t('portal.home.action.viewFreeze'),
          route: '/portal/freezes',
        }
        : null;

  const quickActions = [
    { key: 'payments', title: t('portal.payments.title'), route: '/portal/payments', icon: CreditCard },
    { key: 'renewals', title: t('portal.renewals.title'), route: '/portal/renewals', icon: RefreshCcw },
    { key: 'uniforms', title: t('portal.uniforms.title'), route: '/portal/uniform-store', icon: Shirt },
    { key: 'orders', title: t('portal.orders.title'), route: '/portal/my-orders', icon: ShoppingBag },
    { key: 'profile', title: t('portal.profile.title'), route: '/portal/profile', icon: UserCircle },
  ];

  const recentUpdates = [];
  if (firstPayment) recentUpdates.push({ key: 'p1', title: t('portal.home.latestPayment'), subtitle: `${firstPayment?.status || placeholder} • ${firstPayment?.dueDate || placeholder}` });
  if (overview?.performance?.metrics?.last_order_status) recentUpdates.push({ key: 'o1', title: t('portal.home.latestOrder'), subtitle: `${overview.performance.metrics.last_order_status} • ${overview.performance.metrics.last_order_date || placeholder}` });
  if (overview?.registration?.remainingSessions != null) recentUpdates.push({ key: 's1', title: t('portal.home.sessionsRemaining'), subtitle: `${overview.registration.remainingSessions}/${overview.registration.totalSessions || 0}` });

  return (
    <PortalAccessGate
      titleOverride={t('portal.home.title')}
      error={isSessionInvalid ? (overviewError || new Error(String(invalidSessionReason || 'Portal session invalid'))) : overviewError}
      onRetry={onRefresh}
      onReauthRequired={handleReauthRequired}
    >
      <AppScreen safe scroll={false} style={{ backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={[styles.content, isRTL && styles.rtl]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentOrange} />}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader title={t('portal.home.title')} subtitle={t('portal.home.subtitle')} />

          <Card style={[styles.startCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="bodySmall" weight="semibold" color={colors.textPrimary}>{t('portal.home.startHereTitle')}</Text>
            <Text variant="caption" color={colors.textSecondary}>{t('portal.home.startHereDescription')}</Text>
          </Card>

          <Card style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.heroRow, isRTL && styles.rowReverse]}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated || colors.surface }]}>
                {overview?.player?.imageBase64 ? <Image source={{ uri: overview.player.imageBase64 }} style={styles.avatarImage} /> : <UserCircle size={36} color={colors.textMuted} />}
              </View>
              <View style={[styles.heroText, isRTL && styles.alignEnd]}>
                <Text variant="h4" weight="bold" color={colors.textPrimary}>{overview?.player?.fullName || t('portal.home.welcomeBack')}</Text>
                <Text variant="bodySmall" color={colors.textSecondary}>{overview?.academyName || t('portal.home.academy')}</Text>
                <Badge style={[styles.heroBadge, isRTL && styles.heroBadgeRtl, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Text variant="caption" weight="bold" color={colors.textPrimary}>{overview?.registration?.registrationType || t('portal.home.activePlayer')}</Text>
                </Badge>
              </View>
            </View>
          </Card>

          {actionConfig ? (
            <PortalActionBanner title={actionConfig.title} description={actionConfig.description} actionLabel={actionConfig.cta} onAction={() => router.push(actionConfig.route)} />
          ) : (
            <Card style={[styles.goodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.goodRow, isRTL && styles.rowReverse]}><ShieldAlert size={16} color={colors.success} /><Text variant="body" weight="bold" color={colors.textPrimary}>{t('portal.home.readyTitle')}</Text></View>
              <Text variant="caption" color={colors.textSecondary}>{t('portal.home.readyDescription')}</Text>
            </Card>
          )}

          <View style={[styles.sectionTitleRow, isRTL && styles.rowReverse]}><Text variant="body" weight="bold" color={colors.textPrimary}>{t('portal.home.quickActions')}</Text><Text variant="caption" color={colors.textMuted}>{t('portal.home.topCount', { count: 5 })}</Text></View>
          <View style={[styles.grid, isRTL && styles.gridRtl]}>
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <Pressable key={item.key} style={[styles.quickCard, isRTL && styles.quickCardRtl, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => router.push(item.route)}>
                  <Icon size={18} color={colors.accentOrange} />
                  <Text variant="bodySmall" weight="semibold" color={colors.textPrimary}>{item.title}</Text>
                </Pressable>
              );
            })}
          </View>

          <Card style={[styles.secondaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="body" weight="bold" color={colors.textPrimary}>{t('portal.home.upcomingDueSoon')}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              {hasUnpaid
                ? t('portal.home.nextPaymentDue', { date: firstPayment?.dueDate || placeholder })
                : t('portal.home.registrationEnds', { date: overview?.registration?.endDate || placeholder })}
            </Text>
            <Pressable onPress={() => router.push(hasUnpaid ? '/portal/payments' : '/portal/renewals')} style={[styles.inlineLink, isRTL && styles.rowReverse]}><Text variant="caption" weight="semibold" color={colors.accentOrange}>{t('portal.home.review')}</Text>{isRTL ? <ArrowLeft size={14} color={colors.accentOrange} /> : <ArrowRight size={14} color={colors.accentOrange} />}</Pressable>
          </Card>

          {recentUpdates.length ? (
            <Card style={[styles.secondaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text variant="body" weight="bold" color={colors.textPrimary}>{t('portal.home.recentUpdates')}</Text>
              {recentUpdates.map((item) => (
                <View key={item.key} style={[styles.feedRow, isRTL && styles.feedRowRtl]}><Text variant="bodySmall" weight="semibold" color={colors.textPrimary}>{item.title}</Text><Text variant="caption" color={colors.textSecondary}>{item.subtitle}</Text></View>
              ))}
            </Card>
          ) : null}
        </ScrollView>
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['2xl'], paddingHorizontal: spacing.lg, gap: spacing.md },
  startCard: { borderRadius: 14, borderWidth: 1, padding: spacing.sm, gap: 4 },
  rtl: { direction: 'rtl' },
  rowReverse: { flexDirection: 'row-reverse' },
  alignEnd: { alignItems: 'flex-end' },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroText: { flex: 1, gap: 6 },
  heroBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  heroBadgeRtl: { alignSelf: 'flex-end' },
  avatar: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  goodCard: { borderRadius: 16, borderWidth: 1, padding: spacing.md, gap: 6 },
  goodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridRtl: { flexDirection: 'row-reverse' },
  quickCard: { width: '48%', borderWidth: 1, borderRadius: 14, padding: spacing.md, minHeight: 72, justifyContent: 'space-between' },
  quickCardRtl: { alignItems: 'flex-end' },
  secondaryCard: { borderRadius: 16, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  feedRow: { paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(120,120,120,0.25)' },
  feedRowRtl: { alignItems: 'flex-end' },
  inlineLink: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
});

