// src/screens/portal/SubscriptionHistoryScreen.js
import React, { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { usePortal, usePortalRefresh } from '../../services/portal/portal.hooks';
import { selectRegistration, selectSubscriptionHistory } from '../../services/portal/portal.store';
import { formatDate } from '../../services/portal/portal.normalize';
import { colors, spacing, typography } from '../../theme/portal.styles';
import { Card, PortalEmptyState, PortalHeader, PortalRow, PortalScreen } from '../../components/portal/PortalPrimitives';

const SummaryRow = React.memo(function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
});

export default function SubscriptionHistoryScreen() {
  const { overview } = usePortal();
  const { refreshing, onRefresh } = usePortalRefresh();

  const registration = useMemo(() => selectRegistration(overview), [overview]);
  const history = useMemo(() => selectSubscriptionHistory(overview), [overview]);

  const metrics = overview?.performance?.metrics || {};
  const remaining = Number(metrics?.remaining ?? metrics?.remaining_sessions ?? 0) || 0;
  const total = Number(metrics?.total ?? registration?.sessions ?? 0) || 0;
  const elapsed = total && remaining ? Math.max(total - remaining, 0) : Number(metrics?.elapsed ?? 0) || 0;

  return (
    <PortalScreen>
      <FlatList
        data={[{ id: 'subscription' }]}
        keyExtractor={(i) => i.id}
        renderItem={() => (
          <View style={{ paddingBottom: 24 }}>
            <PortalHeader title="Subscription" subtitle={overview?.academyName || ''} />

            {!overview ? (
              <PortalEmptyState
                title="No subscription data"
                message="Pull to refresh to load your subscription details."
                action={onRefresh}
                actionLabel="Refresh"
              />
            ) : (
              <>
                <Card style={{ marginTop: 10 }}>
                  <Text style={styles.sectionTitle}>Current Registration</Text>
                  <SummaryRow label="Type" value={registration?.type || '—'} />
                  <SummaryRow label="Level" value={registration?.level || '—'} />
                  <SummaryRow label="Start" value={registration?.startDate ? formatDate(registration.startDate) : '—'} />
                  <SummaryRow label="End" value={registration?.endDate ? formatDate(registration.endDate) : '—'} />
                  <SummaryRow label="Sessions" value={`${remaining} remaining / ${total || '—'} total`} />
                  <SummaryRow label="Elapsed" value={elapsed ? String(elapsed) : '—'} />

                  <View style={{ marginTop: 10 }}>
                    <PortalRow title="Group" value={registration?.group?.name || '—'} />
                    <PortalRow title="Course" value={registration?.course?.name || '—'} />
                  </View>

                  {registration?.group?.schedule?.length ? (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.sectionTitle}>Group Schedule</Text>
                      {registration.group.schedule.map((session, idx) => (
                        <PortalRow
                          key={`${session?.day}-${idx}`}
                          title={session?.day || 'Session'}
                          value={session?.time || session?.label || '—'}
                        />
                      ))}
                    </View>
                  ) : null}
                </Card>

                <View style={{ height: 12 }} />

                {history.length ? (
                  <Animated.View entering={FadeInUp.duration(240)}>
                    <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Subscription History</Text>
                    {history.map((item, idx) => (
                      <Card key={String(item?.id || idx)} style={styles.historyCard}>
                        <Text style={styles.historyTitle} numberOfLines={1}>
                          {item?.oldValue?.group?.group_name || item?.oldValue?.course?.course_name || 'Subscription'}
                        </Text>
                        <Text style={styles.historySub}>
                          {item?.startDate ? formatDate(item.startDate) : '—'} → {item?.endDate ? formatDate(item.endDate) : '—'}
                          {item?.sessions ? ` • ${item.sessions} sessions` : ''}
                        </Text>
                        {!!item?.updateData && (
                          <Text style={[styles.historySub, { marginTop: 6 }]} numberOfLines={3}>
                            {typeof item.updateData === 'string' ? item.updateData : JSON.stringify(item.updateData)}
                          </Text>
                        )}
                      </Card>
                    ))}
                  </Animated.View>
                ) : (
                  <PortalEmptyState
                    title="No history yet"
                    message="When subscriptions change, history will appear here."
                  />
                )}
              </>
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
        contentContainerStyle={{ padding: spacing.screenPadding, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    color: colors.textTertiary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  historyCard: {
    marginBottom: spacing.sm,
  },
  historyTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
  },
  historySub: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    marginTop: 4,
  },
});
