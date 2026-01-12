// Portal Orders Screen: order history and reorder actions.
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/portal/portal.api';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { useToast } from '../../components/ui/ToastHost';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

export function PortalMyOrdersScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, isRTL } = useTranslation();
  const { overview } = usePortalOverview();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reorderId, setReorderId] = useState(null);
  const [error, setError] = useState('');

  const tryOutId = overview?.registration?.try_out_id || overview?.registration?.tryOutId;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await portalApi.fetchMyUniformOrders({ try_out: tryOutId });
    if (res?.success) {
      setOrders(res.data?.data || res.data || []);
    } else {
      setError(res?.error?.message || t('portal.orders.error'));
    }
    setLoading(false);
  }, [t, tryOutId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const reorder = async (order) => {
    if (!order?.items?.length) {
      toast.warning(t('portal.orders.reorderUnavailable'));
      return;
    }
    setReorderId(order.id || 'reorder');
    const payload = {
      items: order.items.map((item) => ({
        uniform_id: item.uniform_id || item.id,
        quantity: item.quantity || 1,
        size: item.size,
        player_number: item.player_number,
        nickname: item.nickname,
      })),
    };
    const res = await portalApi.placeUniformOrder(payload);
    if (res?.success) {
      toast.success(t('portal.orders.reorderSuccess'));
    } else {
      toast.error(res?.error?.message || t('portal.orders.reorderError'));
    }
    setReorderId(null);
  };

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader title={t('portal.orders.title')} subtitle={t('portal.orders.subtitle')} />

      {error ? (
        <PortalEmptyState
          icon="alert-triangle"
          title={t('portal.orders.errorTitle')}
          description={error}
          action={(
            <Button variant="secondary" onPress={loadOrders}>
              {t('common.retry')}
            </Button>
          )}
        />
      ) : loading ? (
        <PortalEmptyState
          icon="package"
          title={t('common.loading')}
          description={t('portal.orders.loading')}
        />
      ) : orders.length === 0 ? (
        <PortalEmptyState
          icon="package"
          title={t('portal.orders.emptyTitle')}
          description={t('portal.orders.emptyDescription')}
        />
      ) : (
        <View style={styles.list}>
          {orders.map((order, index) => (
            <PortalCard key={order?.id ?? index} style={styles.card}>
              <Text variant="body" weight="semibold" color={colors.textPrimary}>
                {order?.reference || `${t('portal.orders.order')} #${index + 1}`}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
                {t('portal.orders.status')}: {order?.status || t('portal.orders.statusDefault')}
              </Text>
              <Text variant="caption" color={colors.textMuted} style={styles.subtitle}>
                {order?.created_at || order?.date || '—'}
              </Text>
              <Button
                variant="secondary"
                size="small"
                style={styles.reorderButton}
                loading={reorderId === order?.id}
                onPress={() => reorder(order)}
              >
                {t('portal.orders.reorder')}
              </Button>
            </PortalCard>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  reorderButton: {
    marginTop: spacing.md,
  },
  rtl: {
    direction: 'rtl',
  },
});
