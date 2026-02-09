import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { spacing } from '../../theme/tokens';
import { PortalStatusBadge } from '../../components/portal/PortalStatusBadge';
import { getMappedStatus } from '../../portal/statusMaps';
import { getGlossaryHelp } from '../../portal/portalGlossary';
import { PortalSection } from '../../components/portal/PortalSection';
import { PortalTimeline } from '../../components/portal/PortalTimeline';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';

const statusStep = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('delivered') || s.includes('collected')) return 3;
  if (s.includes('processing') || s.includes('shipped')) return 2;
  if (s.includes('pending')) return 1;
  return 0;
};

export function PortalOrderDetailScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { orders } = usePlayerPortalStore((state) => ({ orders: state.orders }));
  const actions = usePlayerPortalActions();

  useEffect(() => {
    if (!orders || orders.length === 0) actions.fetchOrders();
  }, [actions, orders]);

  const order = useMemo(() => {
    const target = Array.isArray(orderId) ? orderId[0] : orderId;
    return (orders || []).find((item) => String(item?.id || item?.reference) === String(target));
  }, [orderId, orders]);

  if (!order) {
    return (
      <AppScreen safe>
        <AppHeader title={t('portal.orders.detailTitle')} onBackPress={() => router.back()} />
        <EmptyState title={t('portal.orders.detailMissingTitle')} message={t('portal.orders.detailMissingDescription')} actionLabel={t('portal.common.back')} onAction={() => router.back()} />
      </AppScreen>
    );
  }

  const statusMeta = getMappedStatus('order', order?.status || order?.state);
  const inProgress = ['pending', 'processing', 'shipped'].some((x) => String(order?.status || order?.state || '').toLowerCase().includes(x));

  return (
    <PortalAccessGate titleOverride={t('portal.orders.detailTitle')}>
      <AppScreen safe scroll>
        <AppHeader title={t('portal.orders.detailTitle')} />
        {inProgress ? <PortalActionBanner title="Next step" description="Your order is in progress. We will notify you when ready." actionLabel="Back to orders" onAction={() => router.push('/portal/my-orders')} /> : null}

        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <PortalSection title={order?.title || t('portal.orders.defaultTitle')} subtitle="Status & tracking" infoText={getGlossaryHelp('orderStatus')} />
          <PortalStatusBadge label={statusMeta.label} severity={statusMeta.severity} />
          <PortalTimeline steps={['Created', 'Pending', 'Approved', 'Completed']} activeIndex={statusStep(order?.status || order?.state)} />
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.orders.referenceLabel')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{order?.reference || order?.id || t('portal.common.placeholder')}</Text></View>
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.orders.createdLabel')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{order?.created_at || t('portal.common.placeholder')}</Text></View>
        </Card>

        {Array.isArray(order?.items) && order.items.length ? (
          <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text variant="body" weight="bold" color={colors.textPrimary}>{t('portal.orders.itemsTitle')}</Text>
            {order.items.map((item, idx) => (
              <View key={`${item?.id || idx}`} style={styles.itemRow}>
                <Text variant="bodySmall" color={colors.textPrimary}>{item?.name || t('portal.orders.itemFallback')}</Text>
                <Text variant="caption" color={colors.textSecondary}>{item?.size || item?.quantity ? `${item?.size || ''} ${item?.quantity || ''}`.trim() : t('portal.common.placeholder')}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text variant="body" weight="bold" color={colors.textPrimary}>Payment & delivery summary</Text>
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.orders.totalLabel')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{order?.total || order?.amount || t('portal.common.placeholder')}</Text></View>
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>Delivery</Text><Text variant="bodySmall" color={colors.textPrimary}>{order?.delivery_method || order?.delivery || t('portal.common.placeholder')}</Text></View>
        </Card>
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  row: { gap: 4 },
  itemRow: { paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: 'transparent' },
});
