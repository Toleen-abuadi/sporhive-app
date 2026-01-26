// Portal Orders Screen: premium order history.
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Filter, ChevronRight } from 'lucide-react-native';

import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { useI18n } from '../../services/i18n/i18n';
import { PortalFilterSheet } from '../../components/portal/PortalFilterSheet';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { useAuth } from '../../services/auth/auth.store';
import { isPortalReauthError } from '../../services/portal/portal.errors';

export function PortalMyOrdersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { logout } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { orders, ordersLoading, ordersError, filters } = usePlayerPortalStore((state) => ({
    orders: state.orders,
    ordersLoading: state.ordersLoading,
    ordersError: state.ordersError,
    filters: state.filters,
  }));

  const actions = usePlayerPortalActions();

  useEffect(() => {
    // ✅ Scope is required (prevents SQLite bind null in filter persistence)
    actions.hydrateFilters?.('orders');
    actions.fetchOrders?.();
  }, [actions]);

  // ✅ Only one filteredOrders (scoped)
  const filteredOrders = useMemo(
    () => actions.selectFilteredOrders?.('orders') ?? [],
    [actions, orders, filters]
  );

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('portal.filters.statusAll') },
      { value: 'pending', label: t('portal.orders.status.pending') },
      { value: 'processing', label: t('portal.orders.status.processing') },
      { value: 'collected', label: t('portal.orders.status.collected') },
      { value: 'delivered', label: t('portal.orders.status.delivered') },
      { value: 'cancelled', label: t('portal.orders.status.cancelled') },
    ],
    [t]
  );

  const resultsLabel = t('portal.filters.results', { count: filteredOrders.length });

  const needsReauth = isPortalReauthError(ordersError);

  return (
    <PortalAccessGate titleOverride={t('portal.orders.title')}>
      <AppScreen safe scroll={false}>
        <AppHeader
          title={t('portal.orders.title')}
          subtitle={t('portal.orders.subtitle')}
          rightAction={{
            icon: <Filter size={18} color={colors.textPrimary} />,
            onPress: () => setFiltersOpen(true),
            accessibilityLabel: t('portal.filters.open'),
          }}
        />

        <View style={styles.resultsRow}>
          <Text variant="caption" color={colors.textSecondary}>
            {resultsLabel}
          </Text>
          <Button variant="secondary" onPress={() => setFiltersOpen(true)}>
            <Text variant="caption" weight="bold" color={colors.textPrimary}>
              {t('portal.filters.open')}
            </Text>
          </Button>
        </View>

        {ordersLoading && !orders?.length ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={`order-skeleton-${idx}`} height={120} radius={16} />
            ))}
          </View>
        ) : ordersError ? (
          <EmptyState
            title={t('portal.orders.errorTitle')}
            message={ordersError?.message || t('portal.orders.errorDescription')}
            actionLabel={needsReauth ? t('portal.errors.reAuthAction') : t('portal.common.retry')}
            onAction={() => {
              if (needsReauth) {
                logout().finally(() => {
                  router.replace('/(auth)/login?mode=player');
                });
                return;
              }
              actions.fetchOrders?.();
            }}
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title={t('portal.orders.emptyTitle')}
            message={t('portal.orders.emptyDescription')}
            actionLabel={t('portal.filters.clear')}
            onAction={() => actions.clearFilters?.('orders')}
          />
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item, idx) => String(item?.id ?? item?.reference ?? idx)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  const target = item?.id ?? item?.reference;
                  if (target != null) router.push(`/portal/orders/${target}`);
                }}
              >
                <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" weight="bold" color={colors.textPrimary}>
                        {item?.title || t('portal.orders.defaultTitle')}
                      </Text>
                      <Text variant="caption" color={colors.textSecondary}>
                        {item?.created_at || t('portal.common.placeholder')}
                      </Text>
                    </View>

                    <View style={styles.amountWrap}>
                      <Text variant="body" weight="bold" color={colors.textPrimary}>
                        {item?.total || item?.amount || t('portal.common.placeholder')}
                      </Text>
                      <Text variant="caption" color={colors.textMuted}>
                        {item?.status || t('portal.orders.status.pending')}
                      </Text>
                    </View>

                    <ChevronRight size={18} color={colors.textMuted} />
                  </View>
                </Card>
              </Pressable>
            )}
            contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
            showsVerticalScrollIndicator={false}
          />
        )}

        <PortalFilterSheet
          visible={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onClear={() => {
            actions.clearFilters?.('orders');
            setFiltersOpen(false);
          }}
          onApply={(next) => {
            actions.setFilters?.('orders', next);
            setFiltersOpen(false);
          }}
          filters={filters?.orders || {}}
          statusOptions={statusOptions}
          title={t('portal.orders.filtersTitle')}
          subtitle={t('portal.orders.filtersSubtitle')}
        />
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  skeletonWrap: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  amountWrap: {
    alignItems: 'flex-end',
    minWidth: 64,
  },
});
