import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../services/i18n/i18n';
import { useAuth } from '../../services/auth/auth.store';
import { isMissingTryOutError } from '../../services/portal/portal.tryout';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { spacing } from '../../theme/tokens';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { PortalStatusBadge } from '../../components/portal/PortalStatusBadge';
import { getMappedStatus } from '../../portal/statusMaps';
import { getGlossaryHelp } from '../../portal/portalGlossary';
import { PortalInfoAccordion } from '../../components/portal/PortalInfoAccordion';
import { PortalTimeline } from '../../components/portal/PortalTimeline';

const renewalStepIndex = (eligibility) => {
  if (!eligibility) return 0;
  if (eligibility?.eligible) return 2;
  if (eligibility?.pending || String(eligibility?.status || '').toLowerCase().includes('pending')) return 1;
  return 0;
};

export function PortalRenewalDetailScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { ensurePortalReauthOnce } = useAuth();
  const didFetchRef = useRef(false);
  const reauthHandledRef = useRef(false);
  const { overview, overviewLoading, overviewError, renewals, renewalsError } = usePlayerPortalStore((state) => ({
    overview: state.overview,
    overviewLoading: state.overviewLoading,
    overviewError: state.overviewError,
    renewals: state.renewals,
    renewalsError: state.renewalsError,
  }));
  const actions = usePlayerPortalActions();
  const fetchOverview = actions.fetchOverview;
  const fetchRenewals = actions.fetchRenewals;

  useEffect(() => {
    if (!overview && (overviewLoading || overviewError)) return;
    if (didFetchRef.current) return;
    didFetchRef.current = true;

    const load = async () => {
      if (!overview) {
        if (__DEV__) {
          console.trace('[TRACE] PortalRenewalDetailScreen useEffect triggered overview fetch', {
            overview: !!overview,
            overviewLoading,
            hasError: !!overviewError,
          });
        }
        const ov = await fetchOverview();
        if (!ov?.success) return;
      }
      if (!renewals || Object.keys(renewals || {}).length === 0) await fetchRenewals();
    };
    load();
  }, [fetchOverview, fetchRenewals, overview, overviewLoading, overviewError, renewals]);

  const load = useCallback(async () => {
    if (!overview) {
      const ov = await fetchOverview();
      if (!ov?.success) return;
    }
    if (!renewals || Object.keys(renewals || {}).length === 0) await fetchRenewals();
  }, [fetchOverview, fetchRenewals, overview, renewals]);

  const handleReauthRequired = useCallback(async () => {
    if (reauthHandledRef.current) return { recovered: false };
    reauthHandledRef.current = true;
    const res = await ensurePortalReauthOnce?.();
    if (res?.success) {
      reauthHandledRef.current = false;
      await load();
      return { recovered: true };
    }
    return { recovered: false, reason: res?.reason || 'PORTAL_REAUTH_FAILED' };
  }, [ensurePortalReauthOnce, load]);

  const eligibility = useMemo(() => renewals || {}, [renewals]);
  const missingTryOut = isMissingTryOutError(renewalsError);
  const statusMeta = getMappedStatus('renewal', eligibility?.eligible ? 'eligible' : 'ineligible');
  const needsAction = !eligibility?.eligible || Number(eligibility?.days_left) <= 14;

  return (
    <PortalAccessGate titleOverride={t('portal.renewals.detailTitle')} error={renewalsError} onRetry={load} onReauthRequired={handleReauthRequired}>
      <AppScreen safe scroll>
        <AppHeader title={t('portal.renewals.detailTitle')} />

        <PortalInfoAccordion
          title={t('portal.renewals.detailInfo.title')}
          summary={getGlossaryHelp('renewal')}
          bullets={[
            t('portal.renewals.detailInfo.bullet1'),
            t('portal.renewals.detailInfo.bullet2'),
            t('portal.renewals.detailInfo.bullet3'),
          ]}
        />

        {needsAction ? (
          <PortalActionBanner
            title={t('portal.common.actionRequired')}
            description={t('portal.renewals.actionBanner.description', { date: eligibility?.end_date || overview?.registration?.endDate || t('portal.common.placeholder') })}
            actionLabel={t('portal.renewals.actionBanner.label')}
            onAction={() => router.push('/portal/renewals')}
          />
        ) : null}

        {missingTryOut ? (
          <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text variant="body" weight="bold" color={colors.textPrimary}>{t('portal.errors.sessionExpiredTitle')}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>{t('portal.renewals.missingTryOut')}</Text>
            <View style={styles.missingActions}>
              <Button variant="secondary" onPress={load}>{t('portal.common.retry')}</Button>
            </View>
          </Card>
        ) : (
          <>
            <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <Text variant="body" weight="bold" color={colors.textPrimary}>{t('portal.renewals.statusNextStep')}</Text>
              <PortalStatusBadge label={statusMeta.label} severity={statusMeta.severity} />
              <Text variant="caption" color={colors.textSecondary}>{statusMeta.shortHelp}</Text>
              <PortalTimeline steps={[t('portal.common.timeline.created'), t('portal.common.timeline.pending'), t('portal.common.timeline.approved'), t('portal.common.timeline.completed')]} activeIndex={renewalStepIndex(eligibility)} />
              <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.renewals.ends')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{eligibility?.end_date || overview?.registration?.endDate || t('portal.common.placeholder')}</Text></View>
              <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.renewals.daysLeft')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{eligibility?.days_left ?? t('portal.common.placeholder')}</Text></View>
            </Card>

            <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <Text variant="body" weight="bold" color={colors.textPrimary}>{t('portal.renewals.whatYouCanDoTitle')}</Text>
              <Text variant="caption" color={colors.textSecondary}>{needsAction ? t('portal.renewals.whatYouCanDoAction') : t('portal.renewals.whatYouCanDoNoAction')}</Text>
              <Button onPress={() => router.push('/portal/renewals')}>{needsAction ? t('portal.renewals.actionBanner.label') : t('portal.renewals.openOptions')}</Button>
            </Card>
          </>
        )}
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  row: { gap: 4 },
  missingActions: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
});
