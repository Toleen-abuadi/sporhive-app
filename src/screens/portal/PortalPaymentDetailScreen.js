import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PortalStatusBadge } from '../../components/portal/PortalStatusBadge';
import { PortalSection } from '../../components/portal/PortalSection';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { PortalInfoAccordion } from '../../components/portal/PortalInfoAccordion';
import { PortalTimeline } from '../../components/portal/PortalTimeline';
import { getMappedStatus } from '../../portal/statusMaps';
import { getGlossaryHelp } from '../../portal/portalGlossary';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { useToast } from '../../components/ui/ToastHost';
import { spacing } from '../../theme/tokens';
import { useSmartBack } from '../../navigation/useSmartBack';

const stepIndexForStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('paid')) return 3;
  if (normalized.includes('pending') || normalized.includes('processing')) return 2;
  if (normalized.includes('unpaid') || normalized.includes('overdue')) return 1;
  return 0;
};

export function PortalPaymentDetailScreen() {
  const { invoiceId } = useLocalSearchParams();
  const { goBack } = useSmartBack({ fallbackRoute: '/portal/home' });
  const { colors } = useTheme();
  const { t } = useI18n();
  const toast = useToast();
  const { payments } = usePlayerPortalStore((state) => ({ payments: state.payments }));
  const actions = usePlayerPortalActions();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!payments || payments.length === 0) actions.fetchPayments();
  }, [actions, payments]);

  const payment = useMemo(() => {
    const target = Array.isArray(invoiceId) ? invoiceId[0] : invoiceId;
    return (payments || []).find((item) => String(item?.invoiceId || item?.id) === String(target));
  }, [invoiceId, payments]);

  if (!payment) {
    return (
      <AppScreen safe>
        <AppHeader title={t('portal.payments.detailTitle')} onBackPress={goBack} />
        <EmptyState title={t('portal.payments.detailMissingTitle')} message={t('portal.payments.detailMissingDescription')} actionLabel={t('portal.common.back')} onAction={goBack} />
      </AppScreen>
    );
  }

  const statusMeta = getMappedStatus('payment', payment?.status);
  const isUnpaid = ['unpaid', 'pending', 'overdue'].some((s) => String(payment?.status || '').toLowerCase().includes(s));

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

        <PortalInfoAccordion
          title="What happens if unpaid?"
          summary={getGlossaryHelp('paymentStatus')}
          bullets={[
            'Unpaid invoices may block renewal or services after due date.',
            'Open invoice details and settle with the academy cashier or approved method.',
            'Keep your invoice copy for future reference.',
          ]}
        />

        {isUnpaid ? <PortalActionBanner title="Action Required" description={`Resolve this invoice before ${payment?.dueDate || t('portal.common.placeholder')}.`} actionLabel="Pay now" onAction={handleDownload} /> : null}

        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <PortalSection title={payment?.type || t('portal.payments.defaultTitle')} subtitle="Status and next step" />
          <PortalStatusBadge label={statusMeta.label} severity={statusMeta.severity} />
          <PortalTimeline steps={['Created', 'Pending', 'Approved', 'Completed']} activeIndex={stepIndexForStatus(payment?.status)} />
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.payments.amountLabel')}</Text><Text variant="body" weight="bold" color={colors.textPrimary}>{payment?.amount || 0}</Text></View>
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.payments.dueLabel')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{payment?.dueDate || t('portal.common.placeholder')}</Text></View>
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.payments.paidOnLabel')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{payment?.paidOn || t('portal.common.placeholder')}</Text></View>
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.payments.invoiceLabel')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{payment?.invoiceId || t('portal.common.placeholder')}</Text></View>
        </Card>

        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text variant="body" weight="bold" color={colors.textPrimary}>What you can do now</Text>
          <Text variant="caption" color={colors.textSecondary}>{isUnpaid ? 'Pay this invoice and keep your receipt.' : 'This invoice is complete. You can download a copy.'}</Text>
          {payment?.invoiceId ? (
            <Button onPress={handleDownload} disabled={downloading}>
              <Text variant="caption" weight="bold" color={colors.white}>{downloading ? t('portal.payments.invoiceDownloading') : t('portal.payments.invoiceDownload')}</Text>
            </Button>
          ) : null}
        </Card>
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  row: { gap: 4 },
});
