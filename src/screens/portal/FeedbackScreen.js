// src/screens/portal/FeedbackScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { portalApi } from '../../services/portal/portal.api';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { colors, spacing, radius, typography, alphaBg } from '../../theme/portal.styles';
import { PortalCard, PortalRow, PortalScreen, PortalButton } from '../../components/portal/PortalPrimitives';
import { Segmented } from '../../components/portal/PortalForm';

const pctTone = (pct) => {
  const n = Number(pct || 0);
  if (n >= 70) return 'good';
  if (n >= 45) return 'mid';
  return 'low';
};

const Stars = ({ value }) => {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  const filled = Math.round(v);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ color: i <= filled ? colors.primary : colors.borderHeavy, fontSize: 14 }}>
          ★
        </Text>
      ))}
    </View>
  );
};

export default function FeedbackScreen() {
  const { overview, refreshing, refresh } = usePortalOverview();
  const tryOutId = overview?.registration?.try_out?.id || overview?.registration?.try_out_id || null;

  const [types, setTypes] = useState([]); // [{key,label_en,label_ar}]
  const [type, setType] = useState(''); // '' means all

  const [range, setRange] = useState('30'); // 7/30/90/365
  const [loading, setLoading] = useState(false);

  const [overall, setOverall] = useState({ avg_percentage: 0, count: 0 });
  const [recent, setRecent] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [err, setErr] = useState('');

  const dateWindow = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - Number(range || 30) + 1);
    return {
      fromStr: from.toISOString().slice(0, 10),
      toStr: to.toISOString().slice(0, 10),
    };
  }, [range]);

  const load = useCallback(async () => {
    if (!tryOutId) return;
    setLoading(true);
    setErr('');
    try {
      const t = await portalApi.feedbackTypes();
      const typeArr = Array.isArray(t?.rating_types) ? t.rating_types : Array.isArray(t) ? t : [];
      setTypes(typeArr);

      const summary = await portalApi.feedbackPlayerSummary({
        try_out: Number(tryOutId),
        tryout_id: Number(tryOutId),
        limit: 30,
        offset: 0,
      });

      const rec = Array.isArray(summary?.recent) ? summary.recent : Array.isArray(summary?.items) ? summary.items : [];
      setRecent(rec);

      const per = await portalApi.feedbackPeriods({
        try_out: Number(tryOutId),
        tryout_id: Number(tryOutId),
        start_date: dateWindow.fromStr,
        end_date: dateWindow.toStr,
        from: dateWindow.fromStr,
        to: dateWindow.toStr,
        ...(type ? { rating_type: type } : {}),
      });

      const daily = Array.isArray(per?.daily) ? per.daily : Array.isArray(per) ? per : [];
      const o = per?.overall || {};
      setPeriods(daily);
      setOverall({
        avg_percentage: Number(o.avg_percentage ?? o.avg_percent ?? 0),
        count: Number(o.count ?? o.total ?? rec.length ?? 0),
      });
    } catch (e) {
      setErr(e?.message || 'Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, [tryOutId, dateWindow, type]);

  useEffect(() => {
    load();
  }, [load]);

  const overallStars = useMemo(() => (overall.avg_percentage || 0) / 20, [overall]);

  const recentFiltered = useMemo(() => {
    if (!type) return recent;
    return (recent || []).filter((r) => r.rating_type === type);
  }, [recent, type]);

  const empty = !loading && (!recentFiltered?.length && !periods?.length);

  return (
    <PortalScreen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.screenPadding, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Animated.View entering={FadeInDown.duration(240)}>
          <PortalCard
            title="Feedback"
            subtitle="Performance snapshots, recent notes and period analytics."
            right={<View style={styles.pill}><Text style={styles.pillText}>{dateWindow.fromStr} → {dateWindow.toStr}</Text></View>}
          >
            <View style={styles.filters}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <PortalButton label="All" variant={type ? 'secondary' : 'primary'} onPress={() => setType('')} />
                  {types.slice(0, 10).map((rt) => (
                    <PortalButton
                      key={rt.key}
                      label={rt.label_en || rt.key}
                      variant={type === rt.key ? 'primary' : 'secondary'}
                      onPress={() => setType(rt.key)}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.filterLabel}>Range</Text>
              <Segmented
                value={range}
                onChange={setRange}
                options={[
                  { value: '7', label: '7d' },
                  { value: '30', label: '30d' },
                  { value: '90', label: '90d' },
                  { value: '365', label: '1Y' },
                ]}
              />
            </View>

            {!!err && (
              <View style={styles.errBox}>
                <Text style={styles.errText}>{err}</Text>
              </View>
            )}
          </PortalCard>

          <View style={{ height: spacing.md }} />

          <PortalCard title="Overall score" subtitle="Averaged percentage based on period analytics.">
            <View style={styles.overallRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bigPct}>{Math.round(overall.avg_percentage || 0)}%</Text>
                <Text style={styles.smallMeta}>Records: {overall.count || 0}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Stars value={overallStars} />
                <Text style={styles.smallMeta}>{overallStars.toFixed(1)} / 5.0</Text>
              </View>
            </View>
          </PortalCard>

          <View style={{ height: spacing.md }} />

          <PortalCard title="Recent feedback" subtitle="Most recent coach ratings and comments.">
            {loading ? (
              <Text style={styles.muted}>Loading…</Text>
            ) : recentFiltered.length ? (
              recentFiltered.slice(0, 20).map((r, idx) => {
                const pct = Math.round((Number(r.rating_value || r.value || 0)) * 20);
                const tone = pctTone(pct);
                return (
                  <View key={String(r.id || idx)} style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>
                        {r.label_en || r.rating_type || 'Feedback'}
                      </Text>
                      {!!r.comment && <Text style={styles.itemComment}>{r.comment}</Text>}
                      <Text style={styles.itemMeta}>{String(r.date || r.created_at || '').slice(0, 10) || '—'}</Text>
                    </View>
                    <View style={[styles.pctPill, tone === 'good' ? styles.good : tone === 'mid' ? styles.mid : styles.low]}>
                      <Text style={styles.pctText}>{pct}%</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.muted}>No recent feedback.</Text>
            )}
          </PortalCard>

          <View style={{ height: spacing.md }} />

          <PortalCard title="Period analytics" subtitle="Lightweight chart-like list (no heavy libs).">
            {loading ? (
              <Text style={styles.muted}>Loading…</Text>
            ) : periods.length ? (
              periods.slice(0, 20).map((d, idx) => {
                const pct = Math.round(Number(d.avg_percentage ?? d.avg_percent ?? 0));
                const barW = Math.max(4, Math.min(100, pct));
                return (
                  <View key={String(d.date || idx)} style={styles.periodRow}>
                    <Text style={styles.periodDate}>{String(d.date || '').slice(0, 10) || '—'}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${barW}%` }]} />
                    </View>
                    <Text style={styles.periodPct}>{pct}%</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.muted}>No period analytics for this range.</Text>
            )}
          </PortalCard>

          {empty ? (
            <PortalCard title="No feedback yet" subtitle="Once your academy records feedback, it will appear here." style={{ marginTop: spacing.md }}>
              <PortalRow title="Tip" value="Ask your coach to submit performance ratings after sessions." />
            </PortalCard>
          ) : null}
        </Animated.View>
      </ScrollView>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.round,
    backgroundColor: alphaBg(colors.primary, 0.12),
    borderWidth: 1,
    borderColor: alphaBg(colors.primary, 0.28),
  },
  pillText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  filters: { marginTop: spacing.sm },
  filterLabel: {
    color: colors.textTertiary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
    marginBottom: 6,
  },
  errBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: alphaBg(colors.error, 0.14),
    borderWidth: 1,
    borderColor: alphaBg(colors.error, 0.35),
  },
  errText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  overallRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bigPct: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: 34,
  },
  smallMeta: {
    marginTop: 6,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.xs,
  },
  muted: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
  },
  item: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.base,
  },
  itemComment: {
    marginTop: 6,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.35,
  },
  itemMeta: {
    marginTop: 6,
    color: colors.textTertiary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.xs,
  },
  pctPill: {
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  pctText: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.sm,
  },
  good: { backgroundColor: alphaBg(colors.success, 0.14), borderColor: alphaBg(colors.success, 0.35) },
  mid: { backgroundColor: alphaBg(colors.warning, 0.14), borderColor: alphaBg(colors.warning, 0.35) },
  low: { backgroundColor: alphaBg(colors.error, 0.14), borderColor: alphaBg(colors.error, 0.35) },
  periodRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  periodDate: {
    width: 92,
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: radius.round,
    backgroundColor: alphaBg(colors.textTertiary, 0.18),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  periodPct: {
    width: 46,
    textAlign: 'right',
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
});
