import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';

const toPercent = (value) => `${Math.min(Math.max(Number(value || 0), 0), 100)}%`;
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

export function PortalPerformanceScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { ensurePortalReauthOnce } = useAuth();
  const didFetchRef = useRef(false);
  const reauthHandledRef = useRef(false);
  const didReauthRedirectRef = useRef(false);
  const placeholder = t('portal.common.placeholder');
  const { overview } = usePortalOverview();

  const tryoutId = isValidTryOutId(overview?.player?.tryOutId) ? overview?.player?.tryOutId : null;

  const [ratingTypes, setRatingTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isValidTryOutId(tryoutId)) {
      setError('Missing try_out (tryOutId is null). Please refresh portal session.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const typesRes = await portalApi.fetchRatingTypes({ tryout_id: tryoutId });
      if (typesRes?.success) setRatingTypes(asArray(typesRes.data?.data ?? typesRes.data));

      const summaryRes = await portalApi.fetchPerformanceSummary({ tryout_id: tryoutId, limit: 10 });
      if (summaryRes?.success) setSummary(summaryRes.data?.data ?? summaryRes.data ?? null);

      const periodsRes = await portalApi.fetchPerformancePeriods({ tryout_id: tryoutId });
      if (periodsRes?.success) setPeriods(asArray(periodsRes.data?.data ?? periodsRes.data));

      if (!typesRes?.success && !summaryRes?.success && !periodsRes?.success) {
        setError(typesRes?.error?.message || summaryRes?.error?.message || periodsRes?.error?.message || t('portal.performance.error'));
      }
    } catch (e) {
      setError(e?.message || t('portal.performance.error'));
    } finally {
      setLoading(false);
    }
  }, [t, tryoutId]);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    load();
  }, [load]);

  const handleReauthRequired = useCallback(async () => {
    if (reauthHandledRef.current || didReauthRedirectRef.current) return;
    reauthHandledRef.current = true;
    const res = await ensurePortalReauthOnce?.();
    if (res?.success) {
      reauthHandledRef.current = false;
      load();
      return;
    }
    didReauthRedirectRef.current = true;
    router.replace('/(auth)/login?mode=player');
  }, [ensurePortalReauthOnce, load, router]);

  const overallScore = summary?.average || summary?.overall_average || summary?.score || 0;
  const recentRatings = asArray(summary?.recent || summary?.ratings);

  const typeMetrics = useMemo(() => asArray(ratingTypes).map((type, index) => ({
    key: type?.id ?? `${index}`,
    name: type?.name || type?.label || t('portal.performance.ratingLabel', { index: index + 1 }),
    score: (summary?.type_scores && type?.id != null ? summary.type_scores[type.id] : null) ?? type?.average ?? 0,
  })), [ratingTypes, summary, t]);

  const highlights = [
    { label: 'Overall score', value: summary ? String(overallScore) : placeholder },
    { label: 'Recent ratings', value: summary ? String(recentRatings.length) : placeholder },
    { label: 'Tracked periods', value: String(periods.length || 0) },
  ];

  if (loading && !summary && periods.length === 0 && ratingTypes.length === 0 && !error) return <Screen><SporHiveLoader /></Screen>;

  return (
    <PortalAccessGate titleOverride={t('portal.performance.title')} error={error ? { message: error, status: isMissingTryOutError({ message: error }) ? 401 : undefined } : null} onRetry={load} onReauthRequired={handleReauthRequired}>
      <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
        <PortalHeader title={t('portal.performance.title')} subtitle={t('portal.performance.subtitle')} />

        <PortalCard style={styles.card}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>What this means</Text>
          <Text variant="bodySmall" color={colors.textSecondary}>Performance shows how your training has progressed over time. Use highlights for a quick check, then review trends for deeper context.</Text>
        </PortalCard>

        <PortalCard style={styles.card}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>Highlights</Text>
          <View style={styles.highlightRow}>
            {highlights.map((item) => (
              <View key={item.label} style={[styles.highlightTile, { borderColor: colors.border }]}> 
                <Text variant="caption" color={colors.textMuted}>{item.label}</Text>
                <Text variant="body" weight="bold" color={colors.textPrimary}>{item.value}</Text>
              </View>
            ))}
          </View>
        </PortalCard>

        {typeMetrics.length ? (
          <PortalCard style={styles.card}>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>Trends</Text>
            <Text variant="caption" color={colors.textMuted}>Each bar compares the latest rating level by category.</Text>
            <View style={styles.metricStack}>
              {typeMetrics.map((metric) => (
                <View key={metric.key} style={styles.metricItem}>
                  <View style={styles.metricHeader}><Text variant="bodySmall" color={colors.textPrimary}>{metric.name}</Text><Text variant="bodySmall" color={colors.textSecondary}>{metric.score || placeholder}</Text></View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { backgroundColor: colors.accentOrange, width: toPercent((metric.score || 0) * 20) }]} /></View>
                </View>
              ))}
            </View>
          </PortalCard>
        ) : null}

        {periods.length ? (
          <PortalCard style={styles.card}>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>Period narrative</Text>
            {periods.map((period, index) => (
              <View key={period?.id ?? index} style={[styles.periodRow, { borderBottomColor: colors.border }]}> 
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" color={colors.textPrimary}>{period?.label || period?.date || t('portal.performance.periodLabel', { index: index + 1 })}</Text>
                  <Text variant="caption" color={colors.textMuted}>{(period?.from || period?.start || placeholder)} → {(period?.to || period?.end || placeholder)}</Text>
                </View>
                <Text variant="caption" weight="semibold" color={colors.textSecondary}>Player {period?.score ?? 0} / Coach {period?.coach_score ?? 0}</Text>
              </View>
            ))}
          </PortalCard>
        ) : (
          !error ? <PortalEmptyState icon="trending-up" title={t('portal.performance.emptyTitle')} description={t('portal.performance.emptyDescription')} /> : <PortalEmptyState icon="alert-triangle" title={t('portal.performance.errorTitle')} description={error} action={<Button variant="secondary" onPress={load}>{t('portal.common.retry')}</Button>} />
        )}
      </Screen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  rtl: { direction: 'rtl' },
  card: { marginBottom: spacing.sm },
  highlightRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  highlightTile: { flex: 1, borderWidth: 1, borderRadius: 12, padding: spacing.sm, gap: 4 },
  metricStack: { marginTop: spacing.md, gap: spacing.md },
  metricItem: { gap: spacing.xs },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTrack: { height: 6, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  periodRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
