// src/screens/portal/DashboardScreen.js
import React, { useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useI18n } from '../../services/i18n/i18n';
import { usePortal, usePortalRefresh } from '../../services/portal/portal.hooks';
import { selectOverviewHeader, selectPaymentSummary, selectRegistration } from '../../services/portal/portal.store';
import { formatDate, formatMoney } from '../../services/portal/portal.normalize';
import { colors, spacing } from '../../theme/portal.styles';
import {
  ErrorBanner,
  Hero,
  Pill,
  PortalButton,
  PortalCard,
  PortalHeader,
  PortalRow,
  PortalScreen,
  PortalSkeleton,
  PortalEmptyState,
} from '../../components/portal/PortalPrimitives';
import { usePortalModals } from './modals/PortalModalsProvider';

const formatScheduleItem = (s) => {
  if (!s) return '';
  if (typeof s === 'string') return s;
  const day = s?.day || '';
  const t = s?.time;
  if (t && typeof t === 'object') {
    const a = t?.start || '';
    const b = t?.end || '';
    const time = [a, b].filter(Boolean).join('–');
    return `${day} ${time}`.trim();
  }
  return `${day} ${s?.time || ''}`.trim() || JSON.stringify(s);
};

export default function DashboardScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { overview, loading, error, refresh } = usePortal();
  const { refreshing, onRefresh } = usePortalRefresh();
  const { openRenewal, openFreeze } = usePortalModals();

  const header = useMemo(() => selectOverviewHeader(overview), [overview]);
  const registration = useMemo(() => selectRegistration(overview), [overview]);
  const paymentSummary = useMemo(() => selectPaymentSummary(overview), [overview]);

  const metrics = overview?.performance?.metrics || {};
  const remainingSessions = Number(metrics?.remaining ?? metrics?.remaining_sessions ?? 0) || 0;
  const totalSessions = Number(metrics?.total ?? registration?.sessions ?? 0) || 0;

  const quickActions = useMemo(
    () => [
      {
        id: 'renewal',
        label: t('portal.actions.renew', 'Request Renewal'),
        icon: 'refresh-cw',
        onPress: openRenewal,
      },
      {
        id: 'freeze',
        label: t('portal.actions.freeze', 'Request Freeze'),
        icon: 'pause-circle',
        onPress: openFreeze,
      },
      {
        id: 'personal',
        label: t('portal.actions.profile', 'Personal Info'),
        icon: 'user',
        onPress: () => router.push('/(portal)/personal-info'),
      },
      {
        id: 'payments',
        label: t('portal.actions.payments', 'Payments'),
        icon: 'credit-card',
        onPress: () => router.push('/(portal)/payments'),
      },
    ],
    [openFreeze, openRenewal, router, t]
  );

  const listData = useMemo(() => [
    { id: 'subscription' },
    { id: 'payments' },
    { id: 'performance' },
    { id: 'actions' },
  ], []);

  const renderItem = ({ item }) => {
    if (item.id === 'subscription') {
      return (
        <PortalCard style={{ marginHorizontal: spacing.screenPadding, marginTop: spacing.lg }} title={t('portal.overview.subscription', 'Current Subscription')}>
          {loading ? (
            <PortalSkeleton type="card" />
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {!!registration?.type && <Pill label={`${t('portal.subscription.type', 'Type')}: ${registration.type}`} tone="info" />}
                {!!registration?.level && <Pill label={`${t('portal.subscription.level', 'Level')}: ${registration.level}`} tone="neutral" />}
              </View>

              <View style={{ height: spacing.md }} />

              <PortalRow
                leftIcon={<Feather name="users" size={16} color={colors.textSecondary} />}
                title={t('portal.subscription.group', 'Group')}
                value={registration?.group?.name || '—'}
              />
              <PortalRow
                leftIcon={<Feather name="book" size={16} color={colors.textSecondary} />}
                title={t('portal.subscription.course', 'Course')}
                value={registration?.course?.name || '—'}
              />
              <PortalRow
                leftIcon={<Feather name="calendar" size={16} color={colors.textSecondary} />}
                title={t('portal.subscription.dates', 'Dates')}
                value={registration?.startDate && registration?.endDate ? `${formatDate(registration.startDate)} → ${formatDate(registration.endDate)}` : '—'}
              />
              <PortalRow
                leftIcon={<Feather name="activity" size={16} color={colors.textSecondary} />}
                title={t('portal.subscription.sessions', 'Remaining Sessions')}
                value={`${remainingSessions} / ${totalSessions || '—'}`}
              />
            </>
          )}
        </PortalCard>
      );
    }

    if (item.id === 'payments') {
      return (
        <PortalCard style={{ marginHorizontal: spacing.screenPadding, marginTop: spacing.md }} title={t('portal.overview.payments', 'Payment Summary')}>
          {loading ? (
            <PortalSkeleton type="card" />
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <Pill label={`${t('portal.payments.paid', 'Paid')}: ${paymentSummary.paidCount}`} tone="success" />
                <Pill label={`${t('portal.payments.pending', 'Pending')}: ${paymentSummary.pendingCount}`} tone="warning" />
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
                      value={formatScheduleItem(s)}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ marginTop: spacing.md }}>
                <PortalButton
                  title={t('portal.dashboard.openTraining', 'View Training Details')}
                  tone="secondary"
                  right={<Feather name="chevron-right" size={18} color={colors.textSecondary} />}
                  onPress={() => router.push('PortalTrainingInfo')}
                />
              </View>
            </>
          )}
        </PortalCard>
      );
    }

    if (item.id === 'performance') {
      return (
        <PortalCard style={{ marginHorizontal: spacing.screenPadding, marginTop: spacing.md }} title={t('portal.overview.performance', 'Performance Summary')}>
          {loading ? (
            <PortalSkeleton type="card" />
          ) : overview?.performance?.summary ? (
            <Text style={{ color: colors.textSecondary }}>{overview.performance.summary}</Text>
          ) : (
            <Text style={{ color: colors.textSecondary }}>{t('portal.performance.empty', 'No performance summary available yet.')}</Text>
          )}
        </PortalCard>
      );
    }

    if (item.id === 'actions') {
      return (
        <PortalCard style={{ marginHorizontal: spacing.screenPadding, marginTop: spacing.md, marginBottom: spacing.xl }} title={t('portal.overview.actions', 'Quick Actions')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {quickActions.map((action) => (
              <View key={action.id} style={{ width: '48%' }}>
                <PortalButton
                  title={action.label}
                  tone="secondary"
                  left={<Feather name={action.icon} size={16} color={colors.textPrimary} />}
                  onPress={action.onPress}
                />
              </View>
            ))}
          </View>
        </PortalCard>
      );
    }

    return null;
  };

  return (
    <PortalScreen>
      <PortalHeader title={t('tabs.portal', 'Portal')} subtitle={header.academyName} />
      <Hero
        title={playerInfo.fullName || player?.fullName || t('portal.dashboard.hello', 'Hello')}
        subtitle={t('portal.dashboard.subtitle', 'Your progress & requests in one place')}
        badge={playerInfo.academyName || ''}
        imageSource={avatar}
        right={
          <Pressable onPress={() => router.push('PortalPersonalInfo')} hitSlop={8}>
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

      {!overview && !loading ? (
        <PortalEmptyState
          title={t('portal.overview.emptyTitle', 'No overview data')}
          message={t('portal.overview.emptyDesc', 'Pull to refresh to load your portal data.')}
          action={refresh}
          actionLabel={t('portal.actions.retry', 'Retry')}
        />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(entry) => entry.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 140 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}
    </PortalScreen>
  );
}
