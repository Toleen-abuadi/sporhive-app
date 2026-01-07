// src/screens/portal/DashboardScreen.js
import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useI18n } from '../../services/i18n/i18n';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { portalStyles } from '../../theme/portal.styles';
import { Card, ErrorBanner, Hero, Pill, PortalHeader, PortalScreen, SkeletonBlock } from '../../components/portal/PortalPrimitives';

const kpiTone = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('active')) return 'success';
  if (s.includes('expired') || s.includes('inactive')) return 'danger';
  return 'neutral';
};

const fmtDate = (d) => {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toLocaleDateString();
};

const KpiCard = React.memo(function KpiCard({ title, value, subtitle, tone }) {
  return (
    <Card style={portalStyles.kpiCard}>
      <View style={portalStyles.kpiTop}>
        <Text style={portalStyles.kpiTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!tone && <Pill label={tone === 'success' ? 'OK' : tone === 'danger' ? '!' : '•'} tone={tone} />}
      </View>
      <Text style={portalStyles.kpiValue} numberOfLines={1}>
        {value}
      </Text>
      {!!subtitle && (
        <Text style={portalStyles.kpiSub} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </Card>
  );
});

const ActionPill = React.memo(function ActionPill({ label, onPress }) {
  return (
    <Animated.View entering={FadeInUp.duration(240)}>
      <View style={{ marginRight: 10, marginBottom: 10 }}>
        <Text onPress={onPress} style={portalStyles.actionPill}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
});

export default function DashboardScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { overview, loading, refreshing, error, refresh } = usePortalOverview();

  const heroName = overview?.player?.fullName || `${overview?.player?.firstName || ''} ${overview?.player?.lastName || ''}`.trim();
  const academyName = overview?.player?.academyName;

  const metrics = overview?.performance_feedback?.metrics || {};
  const reg = overview?.registration || {};

  const notices = useMemo(() => {
    const list = [];
    const creditsExp = metrics?.credits?.nextExpiry;
    if (creditsExp) list.push({ id: 'credits', text: t('portal.notices.creditsExpiry', 'Credits expire soon') + ` • ${fmtDate(creditsExp)}` });

    const upcomingFreeze = metrics?.freeze?.upcoming;
    if (upcomingFreeze?.start || upcomingFreeze?.from) {
      const a = upcomingFreeze.start || upcomingFreeze.from;
      const b = upcomingFreeze.end || upcomingFreeze.to;
      list.push({ id: 'freeze', text: t('portal.notices.freezeScheduled', 'Freeze scheduled') + ` • ${fmtDate(a)} → ${fmtDate(b)}` });
    }

    const paymentDue = (overview?.payment_info || []).find((p) => String(p?.status || '').toLowerCase().includes('pending'));
    if (paymentDue?.due_date) list.push({ id: 'pay', text: t('portal.notices.paymentDue', 'Payment due') + ` • ${fmtDate(paymentDue.due_date)}` });

    return list;
  }, [metrics, overview?.payment_info, t]);

  const actions = useMemo(
    () => [
      { key: 'edit', label: t('portal.actions.editProfile', 'Edit Profile'), to: '/portal/profile' },
      { key: 'freeze', label: t('portal.actions.requestFreeze', 'Request Freeze'), to: '/portal/freeze' },
      { key: 'renew', label: t('portal.actions.requestRenewal', 'Request Renewal'), to: '/portal/renewal' },
      { key: 'pay', label: t('portal.actions.viewPayments', 'View Payments'), to: '/portal/payments' },
      { key: 'store', label: t('portal.actions.uniformStore', 'Uniform Store'), to: '/portal/uniform-store' },
      { key: 'fb', label: t('portal.actions.feedback', 'Feedback'), to: '/portal/feedback' },
    ],
    [t]
  );

  const onGo = useCallback((to) => router.push(to), [router]);

  const data = useMemo(() => {
    // FlatList needs a stable array. We render the whole page as one item to keep scrolling+refresh native.
    return [{ id: 'dashboard' }];
  }, []);

  const render = useCallback(
    () => (
      <View style={{ paddingBottom: 24 }}>
        <PortalHeader title={t('portal.dashboard.title', 'Dashboard')} subtitle={t('portal.dashboard.subtitle', 'Your training at a glance')} />

        {loading ? (
          <View style={{ marginTop: 12 }}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonBlock h={56} w={56} r={16} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <SkeletonBlock h={16} w="70%" r={8} />
                  <SkeletonBlock h={12} w="45%" r={8} style={{ marginTop: 8 }} />
                </View>
              </View>
            </Card>

            <View style={portalStyles.kpiGrid}>
              {[0, 1, 2, 3].map((i) => (
                <Card key={i} style={portalStyles.kpiCard}>
                  <SkeletonBlock h={12} w="65%" r={8} />
                  <SkeletonBlock h={22} w="45%" r={10} style={{ marginTop: 10 }} />
                  <SkeletonBlock h={10} w="70%" r={8} style={{ marginTop: 10 }} />
                </Card>
              ))}
            </View>
          </View>
        ) : error ? (
          <ErrorBanner
            title={t('portal.errors.overviewTitle', 'Could not load overview')}
            desc={error?.message}
            onRetry={refresh}
          />
        ) : (
          <>
            <Hero
              name={heroName}
              academyName={academyName}
              imageBase64={overview?.player?.imageBase64}
              badgeText={t('portal.dashboard.badge', 'Player')}
            />

            <View style={portalStyles.kpiGrid}>
              <KpiCard
                title={t('portal.kpi.subscription', 'Subscription')}
                value={metrics?.subscriptionStatus || t('portal.common.na', 'N/A')}
                subtitle={t('portal.kpi.subscriptionHint', 'Current status')}
                tone={kpiTone(metrics?.subscriptionStatus)}
              />
              <KpiCard
                title={t('portal.kpi.sessions', 'Sessions')}
                value={`${metrics?.remaining ?? 0} / ${metrics?.total ?? reg?.totalSessions ?? 0}`}
                subtitle={t('portal.kpi.sessionsHint', 'Remaining / Total')}
                tone={metrics?.remaining > 0 ? 'success' : 'danger'}
              />
              <KpiCard
                title={t('portal.kpi.credits', 'Credits')}
                value={`${metrics?.credits?.totalRemaining ?? 0}`}
                subtitle={
                  metrics?.credits?.nextExpiry
                    ? `${t('portal.kpi.nextExpiry', 'Next expiry')}: ${fmtDate(metrics?.credits?.nextExpiry)}`
                    : t('portal.kpi.noExpiry', 'No expiry data')
                }
                tone={(metrics?.credits?.totalRemaining ?? 0) > 0 ? 'neutral' : 'danger'}
              />
              <KpiCard
                title={t('portal.kpi.freeze', 'Freeze')}
                value={
                  metrics?.freeze?.current?.active
                    ? t('portal.freeze.active', 'Active')
                    : metrics?.freeze?.upcoming
                      ? t('portal.freeze.upcoming', 'Upcoming')
                      : t('portal.freeze.none', 'None')
                }
                subtitle={
                  metrics?.freeze?.current?.start
                    ? `${fmtDate(metrics?.freeze?.current?.start)} → ${fmtDate(metrics?.freeze?.current?.end)}`
                    : metrics?.freeze?.upcoming?.start
                      ? `${fmtDate(metrics?.freeze?.upcoming?.start)} → ${fmtDate(metrics?.freeze?.upcoming?.end)}`
                      : t('portal.freeze.noData', 'No freeze scheduled')
                }
                tone={metrics?.freeze?.current?.active ? 'warning' : 'neutral'}
              />
            </View>

            <Card style={{ marginTop: 10 }}>
              <Text style={portalStyles.blockTitle}>{t('portal.dashboard.primaryActions', 'Actions')}</Text>
              <View style={portalStyles.actionWrap}>
                {actions.map((a) => (
                  <ActionPill key={a.key} label={a.label} onPress={() => onGo(a.to)} />
                ))}
              </View>
            </Card>

            <Card style={{ marginTop: 10 }}>
              <Text style={portalStyles.blockTitle}>{t('portal.dashboard.myTraining', 'My Training')}</Text>
              <Text style={portalStyles.blockLine}>
                {t('portal.training.group', 'Group')}: <Text style={portalStyles.em}>{reg?.groupName || '—'}</Text>
              </Text>
              <Text style={portalStyles.blockLine}>
                {t('portal.training.course', 'Course')}: <Text style={portalStyles.em}>{reg?.courseName || '—'}</Text>
              </Text>
              <Text style={portalStyles.blockLine}>
                {t('portal.training.dates', 'Dates')}: <Text style={portalStyles.em}>{fmtDate(reg?.startDate) || '—'} → {fmtDate(reg?.endDate) || '—'}</Text>
              </Text>
              {!!(reg?.schedulePreview?.length) && (
                <View style={{ marginTop: 8 }}>
                  <Text style={portalStyles.muted}>{t('portal.training.schedulePreview', 'Schedule')}</Text>
                  {reg.schedulePreview.slice(0, 3).map((s, idx) => (
                    <Text key={idx} style={portalStyles.scheduleLine} numberOfLines={1}>
                      • {typeof s === 'string' ? s : `${s?.day || ''} ${s?.time || ''}`.trim()}
                    </Text>
                  ))}
                </View>
              )}

              <Text onPress={() => onGo('/portal/training-info')} style={portalStyles.linkBtn}>
                {t('portal.dashboard.openTrainingInfo', 'Open training details')} →
              </Text>
            </Card>

            <Card style={{ marginTop: 10 }}>
              <Text style={portalStyles.blockTitle}>{t('portal.dashboard.notices', 'Notices')}</Text>
              {notices.length ? (
                notices.map((n) => (
                  <View key={n.id} style={portalStyles.noticeRow}>
                    <View style={portalStyles.noticeDot} />
                    <Text style={portalStyles.noticeText}>{n.text}</Text>
                  </View>
                ))
              ) : (
                <Text style={portalStyles.muted}>{t('portal.dashboard.noNotices', 'All good — no notices right now.')}</Text>
              )}
            </Card>
          </>
        )}
      </View>
    ),
    [academyName, actions, error, fmtDate, heroName, loading, notices, onGo, overview, refresh, reg, metrics, t]
  );

  return (
    <PortalScreen>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={render}
        contentContainerStyle={portalStyles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#F97316" />}
        showsVerticalScrollIndicator={false}
      />
    </PortalScreen>
  );
}
