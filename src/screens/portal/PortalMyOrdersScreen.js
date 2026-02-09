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
import { useAuth } from '../../services/auth/auth.store';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { PortalStatusBadge } from '../../components/portal/PortalStatusBadge';
import { PortalSkeleton } from '../../components/portal/PortalSkeleton';
import { PortalErrorState } from '../../components/portal/PortalErrorState';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { PortalInfoAccordion } from '../../components/portal/PortalInfoAccordion';
import { getMappedStatus } from '../../portal/statusMaps';

const isProgress = (status) => ['pending', 'processing', 'shipped'].some((s) => String(status || '').toLowerCase().includes(s));

export function PortalMyOrdersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { ensurePortalReauthOnce } = useAuth();
  const reauthHandledRef = useRef(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { orders, ordersLoading, ordersError, filters } = usePlayerPortalStore((state) => ({
    orders: state.orders,
    ordersLoading: state.ordersLoading,
    ordersError: state.ordersError,
    filters: state.filters,
  }));
  const actions = usePlayerPortalActions();

  useEffect(() => {
    actions.hydrateFilters?.('orders');
    actions.fetchOrders?.();
  }, [actions]);

  const filteredOrders = useMemo(() => actions.selectFilteredOrders?.('orders') ?? [], [actions]);
  const inProgress = filteredOrders.filter((o) => isProgress(o?.status || o?.state));
  const past = filteredOrders.filter((o) => !isProgress(o?.status || o?.state));
  const sections = [
    { key: 'progress', title: 'In progress', data: inProgress },
    { key: 'past', title: 'Past', data: past },
  ].filter((x) => x.data.length);

  const activeOrder = inProgress[0] || null;
  const load = useCallback(() => actions.fetchOrders?.(), [actions]);
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

  return (
    <PortalAccessGate titleOverride={t('portal.orders.title')} error={ordersError} onRetry={load} onReauthRequired={handleReauthRequired}>
      <AppScreen safe scroll={false}>
        <AppHeader title={t('portal.orders.title')} subtitle={t('portal.orders.subtitle')} rightAction={{ icon: <Filter size={18} color={colors.textPrimary} />, onPress: () => setFiltersOpen(true), accessibilityLabel: t('portal.filters.open') }} />

        <View style={styles.pad}>
          <PortalInfoAccordion title="Order statuses" summary="Track your order from processing to delivery/collection." bullets={['In progress orders need no extra action unless staff contact you.', 'Past orders are completed, collected, delivered, or cancelled.']} />
        </View>

        <View style={styles.resultsRow}>
          <Text variant="caption" color={colors.textSecondary}>{t('portal.filters.results', { count: filteredOrders.length })}</Text>
          <Button variant="secondary" onPress={() => setFiltersOpen(true)}>{t('portal.filters.open')}</Button>
        </View>

        {activeOrder ? <View style={styles.banner}><PortalActionBanner title="Action Required" description={`Order ${activeOrder?.reference || activeOrder?.id || ''} is in progress.`} actionLabel={t('portal.orders.viewOrder')} onAction={() => router.push(`/portal/orders/${activeOrder?.id ?? activeOrder?.reference}`)} /></View> : null}

        {ordersLoading && !orders?.length ? (
          <View style={styles.pad}><PortalSkeleton rows={3} height={112} /></View>
        ) : ordersError ? (
          <View style={styles.pad}><PortalErrorState title={t('portal.orders.errorTitle')} message={ordersError?.message || t('portal.orders.errorDescription')} onRetry={load} retryLabel={t('portal.common.retry')} /></View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.pad}><PortalEmptyState title={t('portal.orders.emptyTitle')} description={t('portal.orders.emptyDescription')} action={<Button onPress={() => actions.clearFilters?.('orders')}>{t('portal.filters.clear')}</Button>} /></View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item, idx) => String(item?.id ?? item?.reference ?? idx)}
            renderSectionHeader={({ section }) => <View style={styles.sectionHeader}><Text variant="bodySmall" weight="bold" color={colors.textPrimary}>{section.title}</Text><Text variant="caption" color={colors.textMuted}>{section.data.length}</Text></View>}
            renderItem={({ item }) => {
              const mapped = getMappedStatus('order', item?.status || item?.state);
              return (
                <Pressable onPress={() => router.push(`/portal/orders/${item?.id ?? item?.reference}`)}>
                  <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" weight="bold" color={colors.textPrimary}>{item?.title || t('portal.orders.defaultTitle')}</Text>
                        <Text variant="caption" color={colors.textSecondary}>{`Updated ${item?.updated_at || item?.created_at || t('portal.common.placeholder')}`}</Text>
                      </View>
                      <View style={styles.amountWrap}>
                        <Text variant="body" weight="bold" color={colors.textPrimary}>{item?.total || item?.amount || t('portal.common.placeholder')}</Text>
                        <PortalStatusBadge label={mapped.label} severity={mapped.severity} />
                      </View>
                      <ChevronRight size={18} color={colors.textMuted} />
                    </View>
                  </Card>
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
            stickySectionHeadersEnabled={false}
          />
        )}

        <PortalFilterSheet
          visible={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onClear={() => { actions.clearFilters?.('orders'); setFiltersOpen(false); }}
          onApply={(next) => { actions.setFilters?.('orders', next); setFiltersOpen(false); }}
          filters={filters?.orders || {}}
          statusOptions={[
            { value: 'all', label: t('portal.filters.statusAll') },
            { value: 'pending', label: t('portal.orders.status.pending') },
            { value: 'processing', label: t('portal.orders.status.processing') },
            { value: 'collected', label: t('portal.orders.status.collected') },
            { value: 'delivered', label: t('portal.orders.status.delivered') },
            { value: 'cancelled', label: t('portal.orders.status.cancelled') },
          ]}
          title={t('portal.orders.filtersTitle')}
          subtitle={t('portal.orders.filtersSubtitle')}
        />
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.md },
  banner: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  pad: { paddingHorizontal: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xs },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: 16, borderWidth: 1, padding: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amountWrap: { alignItems: 'flex-end', minWidth: 82, gap: 6 },
});
