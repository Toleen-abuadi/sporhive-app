import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, SectionList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Filter, ChevronRight } from 'lucide-react-native';

import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { useI18n } from '../../services/i18n/i18n';
import { PortalFilterSheet } from '../../components/portal/PortalFilterSheet';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { isPortalForbiddenError } from '../../services/portal/portal.errors';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { PortalErrorState } from '../../components/portal/PortalErrorState';
import { PortalStatusBadge } from '../../components/portal/PortalStatusBadge';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { PortalInfoAccordion } from '../../components/portal/PortalInfoAccordion';
import { getMappedStatus } from '../../portal/statusMaps';
import { getGlossaryHelp } from '../../portal/portalGlossary';
import { getPaymentKindLabel } from '../../utils/paymentLabel';
import { usePortalReady } from '../../hooks/usePortalReady';
import { ThemedLoader } from '../../components/ui/ThemedLoader';

const isPaid = (item) => String(item?.status || '').toLowerCase().includes('paid') && !String(item?.status || '').toLowerCase().includes('unpaid');
const isUnpaid = (item) => {
  const status = String(item?.status || '').toLowerCase();
  return status.includes('unpaid') || status.includes('pending') || status.includes('overdue');
};
const dueSoon = (item) => {
  if (!item?.dueDate || isPaid(item)) return false;
  const due = new Date(item.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
  return days >= 0 && days <= 7;
};

export function PortalPaymentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { ready: portalReady, ensure: ensurePortalReady } = usePortalReady();
  const didFetchRef = useRef(false);
  const reauthHandledRef = useRef(false);
  const didReauthRedirectRef = useRef(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { payments, paymentsLoading, paymentsError, paymentsLoadedOnce, filters } = usePlayerPortalStore((state) => ({
    payments: state.payments,
    paymentsLoading: state.paymentsLoading,
    paymentsError: state.paymentsError,
    paymentsLoadedOnce: state.paymentsLoadedOnce,
    filters: state.filters,
  }));
  const actions = usePlayerPortalActions();

  useEffect(() => {
    if (!portalReady) return;
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    actions.hydrateFilters();
    actions.fetchPayments();
  }, [actions, portalReady]);

  const filteredPayments = useMemo(() => {
    void payments;
    void filters?.payments;
    return actions.selectFilteredPayments() || [];
  }, [actions, filters?.payments, payments]);

  const sections = useMemo(() => {
    const unpaid = filteredPayments.filter(isUnpaid);
    const due = filteredPayments.filter((x) => !isUnpaid(x) && dueSoon(x));
    const paid = filteredPayments.filter((x) => !isUnpaid(x) && !dueSoon(x));
    return [
      { key: 'unpaid', title: t('portal.payments.sections.unpaidAction'), data: unpaid },
      { key: 'due', title: t('portal.payments.sections.dueSoon'), data: due },
      { key: 'paid', title: t('portal.payments.sections.paid'), data: paid },
    ].filter((section) => section.data.length > 0);
  }, [filteredPayments, t]);

  const actionPayment = sections.find((x) => x.key !== 'paid')?.data?.[0] || null;
  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('portal.filters.statusAll') },
      { value: 'paid', label: t('portal.payments.statusPaid') },
      { value: 'unpaid', label: t('portal.payments.statusUnpaid') },
    ],
    [t]
  );

  const isForbidden = isPortalForbiddenError(paymentsError);

  const load = useCallback(async () => {
    const sessionReady = await ensurePortalReady({ source: 'payments_load' });
    if (!sessionReady?.ready) {
      return { success: false, reason: sessionReady?.reason || 'portal_not_ready' };
    }
    return actions.fetchPayments();
  }, [actions, ensurePortalReady]);
  const handleReauthRequired = useCallback(async () => {
    if (reauthHandledRef.current || didReauthRedirectRef.current) return;
    reauthHandledRef.current = true;
    const res = await ensurePortalReady({ source: 'payments_gate_reauth', force: true });
    if (res?.ready) {
      reauthHandledRef.current = false;
      load();
      return;
    }
    didReauthRedirectRef.current = true;
    router.replace('/(auth)/login?mode=player');
  }, [ensurePortalReady, load, router]);

  return (
    <PortalAccessGate titleOverride={t('portal.payments.title')} error={paymentsError} onRetry={load} onReauthRequired={handleReauthRequired}>
      <AppScreen safe scroll={false}>
        <AppHeader
          title={t('portal.payments.title')}
          subtitle={t('portal.payments.subtitle')}
          rightAction={{ icon: <Filter size={18} color={colors.textPrimary} />, onPress: () => setFiltersOpen(true), accessibilityLabel: t('portal.filters.open') }}
        />

        <View style={styles.pad}>
          <PortalInfoAccordion
            title={t('portal.payments.info.title')}
            summary={getGlossaryHelp('paymentStatus')}
            bullets={[
              t('portal.payments.info.bullet1'),
              t('portal.payments.info.bullet2'),
              t('portal.payments.info.bullet3'),
            ]}
          />
        </View>

        <View style={styles.resultsRow}>
          <Text variant="caption" color={colors.textSecondary}>{t('portal.filters.results', { count: filteredPayments.length })}</Text>
          <Button variant="secondary" onPress={() => setFiltersOpen(true)}>{t('portal.filters.open')}</Button>
        </View>

        {actionPayment ? (
          <View style={styles.bannerWrap}>
            <PortalActionBanner
              title={t('portal.common.actionRequired')}
              description={t('portal.payments.actionBannerDescription', {
                date: actionPayment?.dueDate || t('portal.common.placeholder'),
              })}
              actionLabel={t('portal.payments.actionBannerLabel')}
              onAction={() => router.push(`/portal/payments/${actionPayment?.invoiceId || actionPayment?.id}`)}
            />
          </View>
        ) : null}

        {((!portalReady && !paymentsLoadedOnce) || (paymentsLoading && !paymentsLoadedOnce)) ? (
          <View style={[styles.pad, styles.loaderBlock]}>
            <ThemedLoader mode="inline" label={t('common.loading')} />
          </View>
        ) : paymentsError ? (
          <View style={styles.pad}>
            <PortalErrorState
              title={isForbidden ? t('portal.errors.forbiddenTitle') : t('portal.payments.errorTitle')}
              message={isForbidden ? t('portal.errors.forbiddenDescription') : t('portal.payments.errorDescription')}
              onRetry={load}
              retryLabel={t('portal.common.retry')}
            />
          </View>
        ) : paymentsLoadedOnce && filteredPayments.length === 0 ? (
          <View style={styles.pad}>
            <PortalEmptyState
              title={t('portal.payments.emptyTitle')}
              description={t('portal.payments.emptyDescription')}
              action={<Button onPress={() => actions.clearFilters('payments')}>{t('portal.filters.clear')}</Button>}
            />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item, idx) => String(item?.invoiceId || item?.id || idx)}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text variant="bodySmall" weight="bold" color={colors.textPrimary}>{section.title}</Text>
                <Text variant="caption" color={colors.textMuted}>{section.data.length}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const mapped = getMappedStatus('payment', item?.status);
              const paymentTypeLabel = getPaymentKindLabel(item, t);
              return (
                <Pressable onPress={() => router.push(`/portal/payments/${item?.invoiceId || item?.id}`)}>
                  <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" weight="bold" color={colors.textPrimary}>{paymentTypeLabel}</Text>
                        <Text variant="caption" color={colors.textSecondary}>{t('portal.payments.dueDate', { date: item?.dueDate || t('portal.common.placeholder') })}</Text>
                      </View>
                      <View style={styles.amountWrap}>
                        <Text variant="body" weight="bold" color={colors.textPrimary}>{item?.amount || 0}</Text>
                        <PortalStatusBadge label={mapped.label} severity={mapped.severity} />
                      </View>
                      <ChevronRight size={18} color={colors.textMuted} />
                    </View>
                  </Card>
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        )}

        <PortalFilterSheet
          visible={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onClear={() => {
            actions.clearFilters('payments');
            setFiltersOpen(false);
          }}
          onApply={(next) => {
            actions.setFilters('payments', next);
            setFiltersOpen(false);
          }}
          filters={filters?.payments || {}}
          statusOptions={statusOptions}
          showDateRange
          title={t('portal.payments.filtersTitle')}
          subtitle={t('portal.payments.filtersSubtitle')}
        />
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.md },
  bannerWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  pad: { paddingHorizontal: spacing.lg },
  loaderBlock: { minHeight: 336, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginBottom: spacing.xs, marginTop: spacing.md },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: 16, borderWidth: 1, padding: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amountWrap: { alignItems: 'flex-end', minWidth: 86, gap: 6 },
});
