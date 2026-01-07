// src/screens/portal/SubscriptionHistoryScreen.js
import React, { useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useI18n } from '../../services/i18n/i18n';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { portalStyles } from '../../theme/portal.styles';
import { Card, ErrorBanner, PortalHeader, PortalScreen, SkeletonBlock } from '../../components/portal/PortalPrimitives';

const fmt = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString();
};

const TimelineItem = React.memo(function TimelineItem({ item, isLast }) {
  const status = String(item?.status || '').toLowerCase();
  const dotStyle = status.includes('active')
    ? portalStyles.tlDotActive
    : status.includes('expired') || status.includes('inactive')
      ? portalStyles.tlDotDanger
      : portalStyles.tlDotNeutral;

  return (
    <View style={portalStyles.tlRow}>
      <View style={portalStyles.tlRail}>
        <View style={[portalStyles.tlDot, dotStyle]} />
        {!isLast && <View style={portalStyles.tlLine} />}
      </View>

      <Card style={portalStyles.tlCard}>
        <View style={portalStyles.tlTop}>
          <Text style={portalStyles.tlTitle} numberOfLines={1}>
            {item?.course_name || item?.group_name || item?.title || 'Subscription'}
          </Text>
          <Text style={portalStyles.tlStatus}>{item?.status || '—'}</Text>
        </View>

        <Text style={portalStyles.muted}>
          {fmt(item?.start_date)} → {fmt(item?.end_date)} • {item?.sessions || item?.number_of_sessions || '—'} sessions
        </Text>

        {!!item?.created_at && <Text style={[portalStyles.muted, { marginTop: 6 }]}>Created: {fmt(item.created_at)}</Text>}

        {!!item?.log && (
          <Text style={portalStyles.tlLog} numberOfLines={3}>
            {String(item.log)}
          </Text>
        )}
      </Card>
    </View>
  );
});

export default function SubscriptionHistoryScreen() {
  const { t } = useI18n();
  const { overview, loading, refreshing, error, refresh } = usePortalOverview();

  const items = useMemo(() => {
    const list = (overview?.subscription_history || []).slice();
    // best effort: latest first
    list.sort((a, b) => new Date(b?.start_date || b?.created_at || 0) - new Date(a?.start_date || a?.created_at || 0));
    return list;
  }, [overview?.subscription_history]);

  return (
    <PortalScreen>
      <FlatList
        data={[{ id: 'history' }]}
        keyExtractor={(i) => i.id}
        renderItem={() => (
          <View style={{ paddingBottom: 24 }}>
            <PortalHeader title={t('portal.history.title', 'Subscription History')} subtitle={t('portal.history.subtitle', 'A timeline of your memberships')} />

            {loading ? (
              <View style={{ marginTop: 12 }}>
                {[0, 1, 2].map((i) => (
                  <Card key={i} style={portalStyles.tlCard}>
                    <SkeletonBlock h={14} w="55%" r={8} />
                    <SkeletonBlock h={10} w="70%" r={8} style={{ marginTop: 10 }} />
                    <SkeletonBlock h={10} w="90%" r={8} style={{ marginTop: 12 }} />
                  </Card>
                ))}
              </View>
            ) : error ? (
              <ErrorBanner title={t('portal.errors.overviewTitle', 'Could not load overview')} desc={error?.message} onRetry={refresh} />
            ) : items.length ? (
              <Animated.View entering={FadeInUp.duration(240)} style={{ marginTop: 10 }}>
                {items.map((it, idx) => (
                  <TimelineItem
                    key={String(it?.id || it?.uuid || idx)}
                    item={it}
                    isLast={idx === items.length - 1}
                  />
                ))}
              </Animated.View>
            ) : (
              <Card style={{ marginTop: 10 }}>
                <Text style={portalStyles.emptyTitle}>{t('portal.history.emptyTitle', 'No history yet')}</Text>
                <Text style={portalStyles.muted}>{t('portal.history.emptyDesc', 'When subscriptions exist, they will appear here.')}</Text>
              </Card>
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#F97316" />}
        contentContainerStyle={portalStyles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </PortalScreen>
  );
}
