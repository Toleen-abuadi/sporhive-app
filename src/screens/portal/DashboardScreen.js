// src/screens/portal/DashboardScreen.js
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { useI18n } from '../../services/i18n/i18n';
import { usePortal } from '../../services/portal/portal.store';
import { useDashboard } from '../../services/portal/portal.hooks';
import { colors, spacing, formatDate } from '../../theme/portal.styles';
import {
  ErrorBanner,
  Hero,
  Pill,
  PortalButton,
  PortalCard,
  PortalHeader,
  PortalRow,
  PortalScreen,
  SkeletonBlock,
} from '../../components/portal/PortalPrimitives';

import { RequestFreezeModal } from './modals/RequestFreezeModal';
import { RequestRenewalModal } from './modals/RequestRenewalModal';

const imgFromBase64 = (b64, mime = 'image/jpeg') => {
  if (!b64) return null;
  if (String(b64).startsWith('data:')) return { uri: b64 };
  const safeMime = typeof mime === 'string' && mime.includes('/') ? mime : 'image/jpeg';
  return { uri: `data:${safeMime};base64,${b64}` };
};

const toneForSub = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('active')) return 'success';
  if (s.includes('expired') || s.includes('inactive')) return 'danger';
  return 'neutral';
};

export default function DashboardScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { logout, player } = usePortal();
  const { overview, loading, error, refreshing, refresh } = useDashboard();

  const [freezeOpen, setFreezeOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);

  const playerInfo = overview?.player || {};
  const reg = overview?.registration || {};
  const metrics = overview?.performance_feedback?.metrics || {};

  const avatar = imgFromBase64(playerInfo.imageBase64 || playerInfo.image, playerInfo.imageType);

  // Logout handler
  const handleLogout = useCallback(async () => {
    await logout();
    // Navigate to login screen
    router.replace('/portal/login');
  }, [logout, router]);

  const kpis = useMemo(() => {
    const remaining = Number(metrics?.remaining ?? reg.remainingSessions ?? 0) || 0;
    const total = Number(metrics?.total ?? reg.totalSessions ?? 0) || 0;
    const creditsTotal = Number(metrics?.credits?.totalRemaining ?? 0) || 0;
    const creditsExp = metrics?.credits?.nextExpiry || null;

    const currentFreeze = metrics?.freeze?.current || null;
    const upcomingFreeze = metrics?.freeze?.upcoming || null;

    return [
      {
        id: 'sub',
        label: t('portal.kpi.subscription', 'Subscription'),
        value: metrics?.subscriptionStatus || '—',
        tone: toneForSub(metrics?.subscriptionStatus),
        icon: <Feather name="shield" size={16} color={colors.textSecondary} />,
      },
      {
        id: 'sessions',
        label: t('portal.kpi.sessions', 'Sessions'),
        value: `${remaining} / ${total}`,
        tone: remaining > 0 ? 'info' : 'warning',
        icon: <Feather name="activity" size={16} color={colors.textSecondary} />,
      },
      {
        id: 'credits',
        label: t('portal.kpi.credits', 'Credits'),
        value: creditsExp ? `${creditsTotal} • ${formatDate(creditsExp)}` : String(creditsTotal),
        tone: creditsTotal > 0 ? 'success' : 'neutral',
        icon: <Feather name="zap" size={16} color={colors.textSecondary} />,
      },
      {
        id: 'freeze',
        label: t('portal.kpi.freeze', 'Freeze'),
        value: currentFreeze ? t('portal.freeze.active', 'Active') : upcomingFreeze ? t('portal.freeze.scheduled', 'Scheduled') : t('portal.freeze.none', 'None'),
        tone: currentFreeze ? 'warning' : upcomingFreeze ? 'info' : 'neutral',
        icon: <Feather name="pause-circle" size={16} color={colors.textSecondary} />,
      },
    ];
  }, [metrics, reg.remainingSessions, reg.totalSessions, t]);

  const notices = useMemo(() => {
    const list = [];
    const creditsExp = metrics?.credits?.nextExpiry;
    if (creditsExp) list.push({ id: 'credits', text: `${t('portal.notices.creditExpiry', 'Credit expiry')} • ${formatDate(creditsExp)}` });

    const upcomingFreeze = metrics?.freeze?.upcoming;
    const a = upcomingFreeze?.start || upcomingFreeze?.from;
    const b = upcomingFreeze?.end || upcomingFreeze?.to;
    if (a && b) list.push({ id: 'freeze', text: `${t('portal.notices.freezeScheduled', 'Freeze scheduled')} • ${formatDate(a)} → ${formatDate(b)}` });

    const due = Array.isArray(overview?.payment_info) ? overview.payment_info.find((p) => String(p?.status || '').toLowerCase().includes('pend')) : null;
    if (due?.due_date || due?.dueDate) list.push({ id: 'payment', text: `${t('portal.notices.paymentDue', 'Payment due')} • ${formatDate(due.due_date || due.dueDate)}` });

    return list;
  }, [metrics, overview?.payment_info, t]);

  const actions = useMemo(() => ([
    { id: 'profile', label: t('portal.actions.profile', 'Personal Info'), icon: 'user', onPress: () => router.push('/portal/personal-info') },
    { id: 'freeze', label: t('portal.actions.freeze', 'Request Freeze'), icon: 'pause-circle', onPress: () => setFreezeOpen(true) },
    { id: 'renew', label: t('portal.actions.renew', 'Request Renewal'), icon: 'refresh-cw', onPress: () => setRenewOpen(true) },
    { id: 'payments', label: t('portal.actions.payments', 'Payments'), icon: 'credit-card', onPress: () => router.push('/portal/payments') },
    { id: 'store', label: t('portal.actions.uniforms', 'Uniform Store'), icon: 'shopping-bag', onPress: () => router.push('/portal/uniform-store') },
    { id: 'feedback', label: t('portal.actions.feedback', 'Feedback'), icon: 'star', onPress: () => router.push('/portal/feedback') },
  ]), [router, t]);

  const data = useMemo(() => {
    return [
      { type: 'kpis' },
      { type: 'actions' },
      { type: 'training' },
      { type: 'notices' },
    ];
  }, []);

  const renderItem = useCallback(({ item }) => {
    if (item.type === 'kpis') {
      return (
        <PortalCard style={{ marginHorizontal: spacing.screenPadding, marginTop: spacing.lg }} title={t('portal.dashboard.kpis', 'Quick Status')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {loading ? (
              <>
                <SkeletonBlock height={42} width="48%" />
                <SkeletonBlock height={42} width="48%" />
                <SkeletonBlock height={42} width="48%" />
                <SkeletonBlock height={42} width="48%" />
              </>
            ) : (
              kpis.map((k) => (
                <View key={k.id} style={{ width: '48%' }}>
                  <PortalRow
                    leftIcon={k.icon}
                    title={k.label}
                    value={String(k.value || '—')}
                    tone={k.tone}
                  />
                </View>
              ))
            )}
          </View>
        </PortalCard>
      );
    }

    if (item.type === 'actions') {
      return (
        <PortalCard style={{ marginHorizontal: spacing.screenPadding, marginTop: spacing.md }} title={t('portal.dashboard.actions', 'Actions')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {actions.map((a) => (
              <View key={a.id} style={{ width: '48%' }}>
                <PortalButton
                  title={a.label}
                  tone="secondary"
                  left={<Feather name={a.icon} size={16} color={colors.textPrimary} />}
                  onPress={a.onPress}
                />
              </View>
            ))}
          </View>
        </PortalCard>
      );
    }

    if (item.type === 'training') {
      const schedulePreview = Array.isArray(reg.schedulePreview) ? reg.schedulePreview.slice(0, 3) : [];
      return (
        <PortalCard style={{ marginHorizontal: spacing.screenPadding, marginTop: spacing.md }} title={t('portal.dashboard.training', 'My Training')}>
          {loading ? (
            <>
              <SkeletonBlock height={14} width="80%" />
              <View style={{ height: spacing.sm }} />
              <SkeletonBlock height={14} width="60%" />
              <View style={{ height: spacing.sm }} />
              <SkeletonBlock height={14} width="90%" />
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {!!reg.groupName && <Pill label={`${t('portal.training.group', 'Group')}: ${reg.groupName}`} tone="info" />}
                {!!reg.courseName && <Pill label={`${t('portal.training.course', 'Course')}: ${reg.courseName}`} tone="neutral" />}
                {!!reg.level && <Pill label={`${t('portal.training.level', 'Level')}: ${reg.level}`} tone="neutral" />}
              </View>

              <View style={{ height: spacing.md }} />

              {!!reg.startDate && !!reg.endDate ? (
                <Text style={{ color: colors.textSecondary }}>
                  {t('portal.training.dates', 'Dates')}: {formatDate(reg.startDate)} → {formatDate(reg.endDate)}
                </Text>
              ) : null}

              {schedulePreview.length ? (
                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  {schedulePreview.map((s, idx) => (
                    <PortalRow
                      key={idx}
                      leftIcon={<Feather name="calendar" size={16} color={colors.textSecondary} />}
                      title={t('portal.training.session', 'Session')}
                      value={typeof s === 'string' ? s : `${s?.day || ''} ${s?.time || ''}`.trim() || JSON.stringify(s)}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ marginTop: spacing.md }}>
                <PortalButton
                  title={t('portal.dashboard.openTraining', 'View Training Details')}
                  tone="secondary"
                  right={<Feather name="chevron-right" size={18} color={colors.textSecondary} />}
                  onPress={() => router.push('/portal/training-info')}
                />
              </View>
            </>
          )}
        </PortalCard>
      );
    }

    if (item.type === 'notices') {
      return (
        <PortalCard style={{ marginHorizontal: spacing.screenPadding, marginTop: spacing.md, marginBottom: spacing.xl }} title={t('portal.dashboard.notices', 'Notices')}>
          {loading ? (
            <>
              <SkeletonBlock height={14} width="92%" />
              <View style={{ height: spacing.sm }} />
              <SkeletonBlock height={14} width="72%" />
            </>
          ) : notices.length ? (
            <View style={{ gap: spacing.sm }}>
              {notices.map((n) => (
                <PortalRow
                  key={n.id}
                  leftIcon={<Feather name="bell" size={16} color={colors.textSecondary} />}
                  title={t('portal.notice', 'Notice')}
                  value={n.text}
                />
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary }}>{t('portal.dashboard.noNotices', 'No notices right now')}</Text>
          )}
        </PortalCard>
      );
    }

    return null;
  }, [actions, kpis, loading, router, notices, reg, t]);

  return (
    <PortalScreen>
      <PortalHeader 
        title={t('tabs.portal', 'Portal')} 
        subtitle={playerInfo.academyName || player?.academyName || ''}
        right={
          <Pressable onPress={handleLogout} hitSlop={8} style={styles.logoutButton}>
            <Feather name="log-out" size={20} color={colors.textSecondary} />
          </Pressable>
        }
      />
      <Hero
        title={playerInfo.fullName || player?.fullName || t('portal.dashboard.hello', 'Hello')}
        subtitle={t('portal.dashboard.subtitle', 'Your progress & requests in one place')}
        badge={playerInfo.academyName || ''}
        imageSource={avatar}
        right={
          <Pressable onPress={() => router.push('/portal/personal-info')} hitSlop={8}>
            <Feather name="settings" size={20} color={colors.textSecondary} />
          </Pressable>
        }
      />

      {!!error && (
        <ErrorBanner
          title={t('portal.error.title', 'Could not load portal')}
          message={error?.message || String(error)}
          onRetry={refresh}
        />
      )}

      <FlatList
        data={data}
        keyExtractor={(it) => it.type}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      />

      <RequestFreezeModal visible={freezeOpen} onClose={() => setFreezeOpen(false)} />
      <RequestRenewalModal visible={renewOpen} onClose={() => setRenewOpen(false)} />
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
