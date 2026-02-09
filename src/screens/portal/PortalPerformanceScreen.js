// src/screens/portal/PortalPerformanceScreen.js

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/api/playerPortalApi';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { useAuth } from '../../services/auth/auth.store';
import { useTranslation } from '../../services/i18n/i18n';
import { isMissingTryOutError, isValidTryOutId } from '../../services/portal/portal.tryout';
import { spacing } from '../../theme/tokens';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { getGlossaryHelp } from '../../portal/portalGlossary';

const toPercent = (value) => `${Math.min(Math.max(Number(value || 0), 0), 100)}%`;
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

export function PortalPerformanceScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { logout } = useAuth();
  const placeholder = t('portal.common.placeholder');
  const { overview, refresh } = usePortalOverview();

  const tryoutId = isValidTryOutId(overview?.player?.tryOutId) ? overview?.player?.tryOutId : null;
  const missingTryOutMessage = 'Missing try_out (tryOutId is null). Please refresh portal session.';

  const [ratingTypes, setRatingTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!isValidTryOutId(tryoutId)) {
        setError(missingTryOutMessage);
        return;
      }

      setLoading(true);
      setError('');

      const typesRes = await portalApi.fetchRatingTypes({ tryout_id: tryoutId });
      if (typesRes?.success) {
        const raw = typesRes.data?.data ?? typesRes.data;
        setRatingTypes(asArray(raw));
      } else if (typesRes?.error) {
        setError(typesRes.error?.message || t('portal.performance.error'));
      }

      const summaryRes = await portalApi.fetchPerformanceSummary({ tryout_id: tryoutId, limit: 10 });
      if (summaryRes?.success) {
        setSummary(summaryRes.data?.data ?? summaryRes.data ?? null);
      } else if (!typesRes?.error && summaryRes?.error) {
        setError(summaryRes.error?.message || t('portal.performance.error'));
      }

      const periodsRes = await portalApi.fetchPerformancePeriods({ tryout_id: tryoutId });
      if (periodsRes?.success) {
        const raw = periodsRes.data?.data ?? periodsRes.data;
        setPeriods(asArray(raw));
      } else if (!typesRes?.error && !summaryRes?.error && periodsRes?.error) {
        setError(periodsRes.error?.message || t('portal.performance.error'));
      }

      setLoading(false);
    };

    load();
  }, [missingTryOutMessage, t, tryoutId]);

  const overallScore = summary?.average || summary?.overall_average || summary?.score || 0;
  const recentRatings = asArray(summary?.recent || summary?.ratings);

  const typeMetrics = useMemo(() => {
    const list = Array.isArray(ratingTypes) ? ratingTypes : [];
    const used = new Set();

    return list.map((type, index) => {
      const base =
        type?.id != null
          ? `id:${type.id}`
          : type?.name
            ? `name:${String(type.name).trim().toLowerCase()}`
            : `idx:${index}`;

      // Ensure uniqueness even if backend duplicates ids/names
      let key = base;
      let i = 1;
      while (used.has(key)) {
        key = `${base}:${i++}`;
      }
      used.add(key);

      return {
        key,
        id: type?.id ?? key,
        name: type?.name || type?.label || t('portal.performance.ratingLabel', { index: index + 1 }),
        score:
          (summary?.type_scores && type?.id != null ? summary.type_scores[type.id] : null) ??
          type?.average ??
          0,
      };
    });
  }, [ratingTypes, summary]);

  if (loading && !summary && periods.length === 0 && ratingTypes.length === 0 && !error) {
    return (
      <Screen>
        <SporHiveLoader />
      </Screen>
    );
  }

  if (error && isMissingTryOutError({ message: error })) {
    return (
      <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
        <PortalHeader
          title={t('portal.performance.title')}
          subtitle={t('portal.performance.subtitle')}
        />
      <PortalActionBanner title={t('portal.common.nextStep')} description={getGlossaryHelp('performance')} />

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>Highlights</Text>
        <View style={styles.highlightsRow}>
          <View style={styles.highlightItem}><Text variant="caption" color={colors.textMuted}>Overall</Text><Text variant="body" weight="bold" color={colors.textPrimary}>{overallScore || 0}</Text></View>
          <View style={styles.highlightItem}><Text variant="caption" color={colors.textMuted}>Recent ratings</Text><Text variant="body" weight="bold" color={colors.textPrimary}>{recentRatings.length}</Text></View>
          <View style={styles.highlightItem}><Text variant="caption" color={colors.textMuted}>Periods</Text><Text variant="body" weight="bold" color={colors.textPrimary}>{periods.length}</Text></View>
        </View>
      </PortalCard>
        <PortalCard style={styles.card}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            {t('portal.errors.sessionExpiredTitle')}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
            {missingTryOutMessage}
          </Text>
          <View style={styles.missingActions}>
            <Button variant="secondary" onPress={refresh}>
              {t('portal.common.retry')}
            </Button>
            <Button
              onPress={() => {
                logout().finally(() => {
                  router.replace('/(auth)/login?mode=player');
                });
              }}
            >
              {t('portal.errors.reAuthAction')}
            </Button>
          </View>
        </PortalCard>
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader
        title={t('portal.performance.title')}
        subtitle={t('portal.performance.subtitle')}
      />

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          {t('portal.performance.overall')}
        </Text>

        <View style={styles.starRow}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Text
              key={index}
              variant="body"
              color={index < Math.round(overallScore) ? colors.accentOrange : colors.border}
            >
              ★
            </Text>
          ))}
          <Text variant="body" weight="semibold" color={colors.textPrimary} style={styles.starScore}>
            {summary ? overallScore : placeholder}
          </Text>
        </View>

        <Text variant="bodySmall" color={colors.textSecondary}>
          {t('portal.performance.basedOnSessions', { count: recentRatings.length })}
        </Text>
      </PortalCard>

      {typeMetrics.length ? (
        <PortalCard style={styles.card}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            {t('portal.performance.categories')}
          </Text>

          <View style={styles.metricStack}>
            {typeMetrics.map((metric) => (
              <View key={metric.key} style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Text variant="bodySmall" color={colors.textPrimary}>
                    {metric.name}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {metric.score || placeholder}
                  </Text>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: colors.accentOrange, width: toPercent((metric.score || 0) * 20) },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </PortalCard>
      ) : null}

      {error ? (
        <PortalEmptyState icon="alert-triangle" title={t('portal.performance.errorTitle')} description={error} />
      ) : periods.length ? (
        <PortalCard style={styles.card}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            {t('portal.performance.periods')}
          </Text>

          {periods.map((period, index) => (
            <View key={period?.id ?? index} style={styles.periodRow}>
              <View>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {period?.label || period?.date || t('portal.performance.periodLabel', { index: index + 1 })}
                </Text>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.performance.periodRange', {
                    start: period?.from || period?.start || placeholder,
                    end: period?.to || period?.end || placeholder,
                  })}
                </Text>
              </View>

              <View style={styles.barGroup}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(8, (period?.score || 0) * 8), backgroundColor: colors.accentOrange },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(8, (period?.coach_score || 0) * 8),
                      backgroundColor: colors.accentOrangeLight || colors.accentOrange,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </PortalCard>
      ) : (
        <PortalEmptyState icon="trending-up" title={t('portal.performance.emptyTitle')} description={t('portal.performance.emptyDescription')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  card: { marginBottom: spacing.lg },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  starScore: { marginLeft: spacing.sm },
  metricStack: { marginTop: spacing.md, gap: spacing.md },
  metricItem: { gap: spacing.xs },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTrack: { height: 6, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  periodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.md },
  barGroup: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-end' },
  bar: { width: 12, borderRadius: 6 },
  missingActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-start',
  },
  rtl: { direction: 'rtl' },
});
