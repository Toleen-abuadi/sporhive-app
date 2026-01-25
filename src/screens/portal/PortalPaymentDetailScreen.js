import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { useToast } from '../../components/ui/ToastHost';
import { spacing } from '../../theme/tokens';

export function PortalPaymentDetailScreen() {
  const { invoiceId } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const toast = useToast();
  const { payments } = usePlayerPortalStore((state) => ({ payments: state.payments }));
  const actions = usePlayerPortalActions();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!payments || payments.length === 0) {
      actions.fetchPayments();
    }
  }, [actions, payments]);

  const payment = useMemo(() => {
    const target = Array.isArray(invoiceId) ? invoiceId[0] : invoiceId;
    return (payments || []).find(
      (item) => String(item?.invoiceId || item?.id) === String(target)
    );
  }, [invoiceId, payments]);

  if (!payment) {
    return (
      <AppScreen safe>
        <AppHeader title={t('portal.payments.detailTitle')} onBackPress={() => router.back()} />
        <EmptyState
          title={t('portal.payments.detailMissingTitle')}
          message={t('portal.payments.detailMissingDescription')}
          actionLabel={t('portal.common.back')}
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  const handleDownload = async () => {
    if (!payment?.invoiceId) return;
    setDownloading(true);
    const res = await actions.printInvoice({ invoice_id: payment.invoiceId });
    setDownloading(false);
    if (!res?.success) {
      toast?.show?.({ type: 'error', message: t('portal.payments.invoiceError') });
      return;
    }
    toast?.show?.({ type: 'success', message: t('portal.payments.invoiceReady') });
  };

  return (
    <PortalAccessGate titleOverride={t('portal.payments.detailTitle')}>
      <AppScreen safe scroll>
        <AppHeader title={t('portal.payments.detailTitle')} />

        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="body" weight="bold" color={colors.textPrimary}>
            {payment?.type || t('portal.payments.defaultTitle')}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {t('portal.payments.statusLabel', { status: payment?.status || t('portal.payments.statusPending') })}
          </Text>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.payments.amountLabel')}
            </Text>
            <Text variant="body" weight="bold" color={colors.textPrimary}>
              {payment?.amount || 0}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.payments.dueLabel')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {payment?.dueDate || t('portal.common.placeholder')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.payments.paidOnLabel')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {payment?.paidOn || t('portal.common.placeholder')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.payments.invoiceLabel')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {payment?.invoiceId || t('portal.common.placeholder')}
            </Text>
          </View>
        </Card>

        {payment?.invoiceId ? (
          <Button onPress={handleDownload} disabled={downloading}>
            <Text variant="caption" weight="bold" color={colors.white}>
              {downloading ? t('portal.payments.invoiceDownloading') : t('portal.payments.invoiceDownload')}
            </Text>
          </Button>
        ) : null}
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
});
