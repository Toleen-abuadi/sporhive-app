import React, { useEffect, useMemo } from 'react';
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

export function PortalRenewalDetailScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { logout } = useAuth();
  const { overview, renewals, renewalsError } = usePlayerPortalStore((state) => ({
    overview: state.overview,
    renewals: state.renewals,
    renewalsError: state.renewalsError,
  }));
  const actions = usePlayerPortalActions();

  useEffect(() => {
    if (!overview) actions.fetchOverview();
    if (!renewals || Object.keys(renewals || {}).length === 0) actions.fetchRenewals();
  }, [actions, overview, renewals]);

  const eligibility = useMemo(() => renewals || {}, [renewals]);
  const missingTryOut = isMissingTryOutError(renewalsError);

  return (
    <PortalAccessGate titleOverride={t('portal.renewals.detailTitle')}>
      <AppScreen safe scroll>
        <AppHeader title={t('portal.renewals.detailTitle')} />

        {missingTryOut ? (
          <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="body" weight="bold" color={colors.textPrimary}>
              {t('portal.errors.sessionExpiredTitle')}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Missing try_out (tryOutId is null). Please refresh portal session.
            </Text>
            <View style={styles.missingActions}>
              <Button variant="secondary" onPress={actions.fetchOverview}>
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
          </Card>
        ) : (
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="body" weight="bold" color={colors.textPrimary}>
            {t('portal.renewals.detailSummaryTitle')}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {t('portal.renewals.detailSummarySubtitle')}
          </Text>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.renewals.statusLabel')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {eligibility?.eligible ? t('portal.renewals.eligible') : t('portal.renewals.notEligible')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.renewals.ends')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {eligibility?.end_date || overview?.registration?.endDate || t('portal.common.placeholder')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.renewals.daysLeft')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {eligibility?.days_left ?? t('portal.common.placeholder')}
            </Text>
          </View>
        </Card>
        )}
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    gap: 4,
  },
  missingActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
