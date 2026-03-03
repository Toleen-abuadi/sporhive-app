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
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { PortalStatusBadge } from '../../components/portal/PortalStatusBadge';
import { PortalErrorState } from '../../components/portal/PortalErrorState';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { PortalInfoAccordion } from '../../components/portal/PortalInfoAccordion';
import { getMappedStatus } from '../../portal/statusMaps';
import { portalApi } from '../../services/api/playerPortalApi';
import { usePortalReady } from '../../hooks/usePortalReady';
import { ThemedLoader } from '../../components/ui/ThemedLoader';

const isProgress = (status) => ['pending', 'processing', 'shipped'].some((s) => String(status || '').toLowerCase().includes(s));
const safeArray = (value) => (Array.isArray(value) ? value : []);
const toIdKey = (value) => {
  if (value == null) return '';
  const normalized = String(value).trim();
  return normalized || '';
};

const extractCatalogProducts = (raw) => {
  if (Array.isArray(raw?.data?.products)) return raw.data.products;
  if (Array.isArray(raw?.products)) return raw.products;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw)) return raw;
  return [];
};

let catalogProductsByIdCache = null;
let catalogProductsByIdPromise = null;

const fetchCatalogProductsById = async () => {
  if (catalogProductsByIdCache) return catalogProductsByIdCache;
  if (!catalogProductsByIdPromise) {
    catalogProductsByIdPromise = (async () => {
      const res = await portalApi.fetchUniformStore();
      if (!res?.success) return null;

      const products = safeArray(extractCatalogProducts(res.data));
      const next = products.reduce((acc, product) => {
        const key = toIdKey(product?.id);
        if (key) acc[key] = product;
        return acc;
      }, {});

      catalogProductsByIdCache = next;
      return next;
    })().finally(() => {
      catalogProductsByIdPromise = null;
    });
  }
  return catalogProductsByIdPromise;
};

export function PortalMyOrdersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const { ready: portalReady, ensure: ensurePortalReady } = usePortalReady();
  const didFetchRef = useRef(false);
  const reauthHandledRef = useRef(false);
  const didReauthRedirectRef = useRef(false);
  const productLookupAttemptedRef = useRef(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [catalogProductsById, setCatalogProductsById] = useState(() => catalogProductsByIdCache || {});
  const { orders, ordersLoading, ordersError, ordersLoadedOnce, filters } = usePlayerPortalStore((state) => ({
    orders: state.orders,
    ordersLoading: state.ordersLoading,
    ordersError: state.ordersError,
    ordersLoadedOnce: state.ordersLoadedOnce,
    filters: state.filters,
  }));
  const actions = usePlayerPortalActions();

  useEffect(() => {
    if (!portalReady) return;
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    actions.hydrateFilters?.('orders');
    actions.fetchOrders?.();
  }, [actions, portalReady]);

  const filteredOrders = useMemo(() => {
    void orders;
    void filters?.orders;
    return actions.selectFilteredOrders?.('orders') ?? [];
  }, [actions, filters?.orders, orders]);
  const orderProductIds = useMemo(
    () => Array.from(new Set(filteredOrders.map((order) => toIdKey(order?.product_id)).filter(Boolean))),
    [filteredOrders]
  );

  useEffect(() => {
    if (!orderProductIds.length) return;

    const cache = catalogProductsByIdCache || {};
    const hasMissingProducts = orderProductIds.some((id) => !cache[id]);
    if (!hasMissingProducts) {
      if (catalogProductsById !== cache) setCatalogProductsById(cache);
      return;
    }

    if (productLookupAttemptedRef.current) return;
    productLookupAttemptedRef.current = true;

    let active = true;
    (async () => {
      const resolved = await fetchCatalogProductsById();
      if (active && resolved) setCatalogProductsById(resolved);
    })();

    return () => {
      active = false;
    };
  }, [catalogProductsById, orderProductIds]);

  const resolveOrderTitle = useCallback((order) => {
    const product = catalogProductsById[toIdKey(order?.product_id)];
    if (product) {
      if (isRTL && product?.name_ar) return product.name_ar;
      return product?.name_en || product?.name || order?.title || t('portal.orders.defaultTitle');
    }
    return order?.title || t('portal.orders.defaultTitle');
  }, [catalogProductsById, isRTL, t]);

  const inProgress = filteredOrders.filter((o) => isProgress(o?.status || o?.state));
  const past = filteredOrders.filter((o) => !isProgress(o?.status || o?.state));
  const sections = [
    { key: 'progress', title: t('portal.orders.sections.inProgress'), data: inProgress },
    { key: 'past', title: t('portal.orders.sections.past'), data: past },
  ].filter((x) => x.data.length);

  const activeOrder = inProgress[0] || null;
  const load = useCallback(async () => {
    const sessionReady = await ensurePortalReady({ source: 'orders_load' });
    if (!sessionReady?.ready) {
      return { success: false, reason: sessionReady?.reason || 'portal_not_ready' };
    }
    return actions.fetchOrders?.();
  }, [actions, ensurePortalReady]);
  const handleReauthRequired = useCallback(async () => {
    if (reauthHandledRef.current || didReauthRedirectRef.current) return;
    reauthHandledRef.current = true;
    const res = await ensurePortalReady({ source: 'orders_gate_reauth', force: true });
    if (res?.ready) {
      reauthHandledRef.current = false;
      load();
      return;
    }
    didReauthRedirectRef.current = true;
    router.replace('/(auth)/login?mode=player');
  }, [ensurePortalReady, load, router]);

  return (
    <PortalAccessGate titleOverride={t('portal.orders.title')} error={ordersError} onRetry={load} onReauthRequired={handleReauthRequired}>
      <AppScreen safe scroll={false} contentStyle={styles.screen}>
        <AppHeader title={t('portal.orders.title')} subtitle={t('portal.orders.subtitle')} rightAction={{ icon: <Filter size={18} color={colors.textPrimary} />, onPress: () => setFiltersOpen(true), accessibilityLabel: t('portal.filters.open') }} />

        <View style={styles.pad}>
          <PortalInfoAccordion
            title={t('portal.orders.info.title')}
            summary={t('portal.orders.info.summary')}
            bullets={[t('portal.orders.info.bullet1'), t('portal.orders.info.bullet2')]}
          />
        </View>

        <View style={styles.resultsRow}>
          <Text variant="caption" color={colors.textSecondary}>{t('portal.filters.results', { count: filteredOrders.length })}</Text>
          <Button variant="secondary" onPress={() => setFiltersOpen(true)}>{t('portal.filters.open')}</Button>
        </View>

        {activeOrder ? <View style={styles.banner}><PortalActionBanner title={t('portal.common.actionRequired')} description={t('portal.orders.actionInProgress', { id: activeOrder?.reference || activeOrder?.id || '' })} actionLabel={t('portal.orders.viewOrder')} onAction={() => router.push(`/portal/orders/${activeOrder?.id ?? activeOrder?.reference}`)} /></View> : null}

        {((!portalReady && !ordersLoadedOnce) || (ordersLoading && !ordersLoadedOnce)) ? (
          <View style={[styles.pad, styles.loaderBlock]}>
            <ThemedLoader mode="inline" label={t('common.loading')} />
          </View>
        ) : ordersError ? (
          <View style={styles.pad}><PortalErrorState title={t('portal.orders.errorTitle')} message={t('portal.orders.errorDescription')} onRetry={load} retryLabel={t('portal.common.retry')} /></View>
        ) : ordersLoadedOnce && filteredOrders.length === 0 ? (
          <View style={styles.pad}><PortalEmptyState title={t('portal.orders.emptyTitle')} description={t('portal.orders.emptyDescription')} action={<Button onPress={() => actions.clearFilters?.('orders')}>{t('portal.filters.clear')}</Button>} /></View>
        ) : (
          <SectionList
            style={styles.list}
            sections={sections}
            keyExtractor={(item, idx) => String(item?.id ?? item?.reference ?? idx)}
            renderSectionHeader={({ section }) => <View style={styles.sectionHeader}><Text variant="bodySmall" weight="bold" color={colors.textPrimary}>{section.title}</Text><Text variant="caption" color={colors.textMuted}>{section.data.length}</Text></View>}
            renderItem={({ item }) => {
              const mapped = getMappedStatus('order', item?.status || item?.state);
              const orderTitle = resolveOrderTitle(item);
              return (
                <Pressable onPress={() => router.push(`/portal/orders/${item?.id ?? item?.reference}`)}>
                  <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" weight="bold" color={colors.textPrimary}>{orderTitle}</Text>
                        <Text variant="caption" color={colors.textSecondary}>{t('portal.orders.lastUpdated', { date: item?.updated_at || item?.created_at || t('portal.common.placeholder') })}</Text>
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
  screen: { flex: 1 },
  list: { flex: 1 },
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.md },
  banner: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  pad: { paddingHorizontal: spacing.lg },
  loaderBlock: { minHeight: 336, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xs },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: 16, borderWidth: 1, padding: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amountWrap: { alignItems: 'flex-end', minWidth: 82, gap: 6 },
});
