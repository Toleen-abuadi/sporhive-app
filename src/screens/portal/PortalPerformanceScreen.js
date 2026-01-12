// Portal Performance Screen: ratings, feedback, and period analytics.
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/portal/portal.api';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

const toPercent = (value) => `${Math.min(Math.max(Number(value || 0), 0), 100)}%`;

export function PortalPerformanceScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const { overview } = usePortalOverview();
  const tryoutId = overview?.registration?.try_out_id || overview?.registration?.tryOutId || overview?.tryOutId;

  const [ratingTypes, setRatingTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      const typesRes = await portalApi.fetchRatingTypes({ tryout_id: tryoutId });
      if (typesRes?.success) {
        setRatingTypes(typesRes.data?.data || typesRes.data || []);
      } else if (typesRes?.error) {
        setError(typesRes.error?.message || t('portal.performance.error'));
      }
      const summaryRes = await portalApi.fetchPerformanceSummary({ tryout_id: tryoutId, limit_recent: 10 });
      if (summaryRes?.success) {
        setSummary(summaryRes.data?.data || summaryRes.data);
      } else if (!typesRes?.error && summaryRes?.error) {
        setError(summaryRes.error?.message || t('portal.performance.error'));
      }
      const periodsRes = await portalApi.fetchPerformancePeriods({ tryout_id: tryoutId });
      if (periodsRes?.success) {
        setPeriods(periodsRes.data?.data || periodsRes.data || []);
      } else if (!typesRes?.error && !summaryRes?.error && periodsRes?.error) {
        setError(periodsRes.error?.message || t('portal.performance.error'));
      }
      setLoading(false);
    };
    load();
  }, [t, tryoutId]);

  const overallScore = summary?.average || summary?.overall_average || summary?.score || 4.6;
  const recentRatings = summary?.recent || summary?.ratings || [];

  const typeMetrics = useMemo(() => {
    if (!ratingTypes?.length) return [];
    return ratingTypes.map((type) => ({
      id: type.id || type.name,
      name: type.name || type.label || 'Rating',
      score: summary?.type_scores?.[type.id] || type.average || 4.2,
    }));
  }, [ratingTypes, summary?.type_scores]);

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader title={t('portal.performance.title')} subtitle={t('portal.performance.subtitle')} />

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          {t('portal.performance.overall')}
        </Text>
        <View style={styles.starRow}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Text key={index} variant="body" color={index < Math.round(overallScore) ? colors.accentOrange : colors.border}>
              ★
            </Text>
          ))}
          <Text variant="body" weight="semibold" color={colors.textPrimary} style={styles.starScore}>
            {overallScore}
          </Text>
        </View>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {t('portal.performance.basedOn')} {recentRatings.length || 10} {t('portal.performance.sessions')}
        </Text>
      </PortalCard>

      {typeMetrics.length ? (
        <PortalCard style={styles.card}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            {t('portal.performance.categories')}
          </Text>
          <View style={styles.metricStack}>
            {typeMetrics.map((metric) => (
              <View key={metric.id} style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Text variant="bodySmall" color={colors.textPrimary}>
                    {metric.name}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {metric.score}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}
                >
                  <View style={[styles.progressFill, { backgroundColor: colors.accentOrange, width: toPercent(metric.score * 20) }]} />
                </View>
              </View>
            ))}
          </View>
        </PortalCard>
      ) : null}

      {error ? (
        <PortalEmptyState
          icon="alert-triangle"
          title={t('portal.performance.errorTitle')}
          description={error}
        />
      ) : periods.length ? (
        <PortalCard style={styles.card}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            {t('portal.performance.periods')}
          </Text>
          {periods.map((period, index) => (
            <View key={period?.id ?? index} style={styles.periodRow}>
              <View>
                  <Text variant="bodySmall" color={colors.textPrimary}>
                    {period?.label || period?.date || `${t('portal.performance.period')} ${index + 1}`}
                  </Text>
                <Text variant="caption" color={colors.textMuted}>
                  {period?.from || period?.start} → {period?.to || period?.end}
                </Text>
              </View>
              <View style={styles.barGroup}>
                <View style={[styles.bar, { height: Math.max(8, (period?.score || 4) * 8), backgroundColor: colors.accentOrange }]} />
                <View style={[styles.bar, { height: Math.max(8, (period?.coach_score || 3.5) * 8), backgroundColor: colors.accentOrangeLight || colors.accentOrange }]} />
              </View>
            </View>
          ))}
        </PortalCard>
      ) : loading ? (
        <PortalEmptyState
          icon="trending-up"
          title={t('portal.performance.loadingTitle')}
          description={t('portal.performance.loadingDescription')}
        />
      ) : (
        <PortalEmptyState
          icon="trending-up"
          title={t('portal.performance.emptyTitle')}
          description={t('portal.performance.emptyDescription')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  starScore: {
    marginLeft: spacing.sm,
  },
  metricStack: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  metricItem: {
    gap: spacing.xs,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  barGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-end',
  },
  bar: {
    width: 12,
    borderRadius: 6,
  },
  rtl: {
    direction: 'rtl',
  },
});
