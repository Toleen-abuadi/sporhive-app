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
  const reauthHandledRef = useRef(false);
  const { overview, renewals, renewalsError } = usePlayerPortalStore((state) => ({
    overview: state.overview,
    renewals: state.renewals,
    renewalsError: state.renewalsError,
  }));
  const actions = usePlayerPortalActions();

  useEffect(() => {
    const load = async () => {
      if (!overview) {
        const ov = await actions.fetchOverview();
        if (!ov?.success) return;
      }
      if (!renewals || Object.keys(renewals || {}).length === 0) await actions.fetchRenewals();
    };
    load();
  }, [actions, overview, renewals]);

  const load = useCallback(async () => {
    if (!overview) {
      const ov = await actions.fetchOverview();
      if (!ov?.success) return;
    }
    if (!renewals || Object.keys(renewals || {}).length === 0) await actions.fetchRenewals();
  }, [actions, overview, renewals]);

  const handleReauthRequired = useCallback(async () => {
    if (reauthHandledRef.current) return;
    reauthHandledRef.current = true;
    const res = await ensurePortalReauthOnce?.();
    if (res?.success) {
      reauthHandledRef.current = false;
      load();
      return;
    }
    router.replace('/(auth)/login?mode=player');
  }, [ensurePortalReauthOnce, load, router]);

  const eligibility = useMemo(() => renewals || {}, [renewals]);
  const missingTryOut = isMissingTryOutError(renewalsError);
  const statusMeta = getMappedStatus('renewal', eligibility?.eligible ? 'eligible' : 'ineligible');
  const needsAction = !eligibility?.eligible || Number(eligibility?.days_left) <= 14;

  return (
    <PortalAccessGate titleOverride={t('portal.renewals.detailTitle')} error={renewalsError} onRetry={load} onReauthRequired={handleReauthRequired}>
      <AppScreen safe scroll>
        <AppHeader title={t('portal.renewals.detailTitle')} />

        <PortalInfoAccordion
          title="What is renewal?"
          summary={getGlossaryHelp('renewal')}
          bullets={[
            'Renewal extends your training registration.',
            'If renewal is pending, wait for approval notification.',
            'If ineligible, check your current plan end date and contact academy.',
          ]}
        />

        {needsAction ? (
          <PortalActionBanner
            title="Action Required"
            description={`Renewal recommended before ${eligibility?.end_date || overview?.registration?.endDate || t('portal.common.placeholder')}`}
            actionLabel="Renew now"
            onAction={() => router.push('/portal/renewals')}
          />
        ) : null}

        {missingTryOut ? (
          <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text variant="body" weight="bold" color={colors.textPrimary}>{t('portal.errors.sessionExpiredTitle')}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>Missing try_out (tryOutId is null). Please refresh portal session.</Text>
            <View style={styles.missingActions}>
              <Button variant="secondary" onPress={load}>{t('portal.common.retry')}</Button>
            </View>
          </Card>
        ) : (
          <>
            <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <Text variant="body" weight="bold" color={colors.textPrimary}>STATUS & NEXT STEP</Text>
              <PortalStatusBadge label={statusMeta.label} severity={statusMeta.severity} />
              <Text variant="caption" color={colors.textSecondary}>{statusMeta.shortHelp}</Text>
              <PortalTimeline steps={['Created', 'Pending', 'Approved', 'Completed']} activeIndex={renewalStepIndex(eligibility)} />
              <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.renewals.ends')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{eligibility?.end_date || overview?.registration?.endDate || t('portal.common.placeholder')}</Text></View>
              <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.renewals.daysLeft')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{eligibility?.days_left ?? t('portal.common.placeholder')}</Text></View>
            </Card>

            <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <Text variant="body" weight="bold" color={colors.textPrimary}>What you can do now</Text>
              <Text variant="caption" color={colors.textSecondary}>{needsAction ? 'Complete renewal request now to avoid interruption.' : 'No action needed right now. Keep tracking your end date.'}</Text>
              <Button onPress={() => router.push('/portal/renewals')}>{needsAction ? 'Renew now' : 'Open renewal options'}</Button>
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
