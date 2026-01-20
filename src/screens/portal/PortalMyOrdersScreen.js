// Portal Orders Screen: premium order history + order details sheet.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Platform, Animated, Easing } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/portal/portal.api';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';
import { normalizeUniformOrders } from '../../services/portal/portal.normalize';

const alphaHex = (hex, alpha = '1A') => {
  if (!hex) return hex;
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split('');
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  if (normalized.length === 6) return `#${normalized}${alpha}`;
  if (normalized.length === 8) return `#${normalized.slice(0, 6)}${alpha}`;
  return hex;
};

const STATUS_META = {
  pending_payment: { labelKey: 'service.portal.orders.status.pendingPayment', tone: 'warning' },
  collected: { labelKey: 'service.portal.orders.status.collected', tone: 'success' },
  processing: { labelKey: 'service.portal.orders.status.processing', tone: 'info' },
  cancelled: { labelKey: 'service.portal.orders.status.cancelled', tone: 'danger' },
};

const normalizeSizeLabel = (value, labels) => {
  const v = String(value || '').trim();
  if (!v) return labels.placeholder;
  if (v === '__one_size__') return labels.oneSize;
  return v;
};

const normalizeTypeLabel = (value, labels) => {
  const v = String(value || '').trim();
  if (!v) return labels.placeholder;
  return v.toLowerCase() === 'full' ? labels.fullKit : v;
};

const formatDateTime = (iso, locale, placeholder) => {
  if (!iso) return placeholder;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    // Fallback for older runtimes
    return d.toISOString().replace('T', ' ').slice(0, 16);
  }
};

function StatusPill({ status, t, colors }) {
  const meta = STATUS_META[status] || { labelKey: 'service.portal.orders.status.default', tone: 'neutral' };

  const label =
    meta.labelKey && typeof t === 'function'
      ? t(meta.labelKey)
      : status || t('service.portal.common.placeholder');

  const tone = meta.tone;

  const toneColor =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
        ? colors.warning
        : tone === 'danger'
          ? colors.error
          : tone === 'info'
            ? colors.info
            : colors.textSecondary;

  const bg = alphaHex(toneColor, '1A');
  const border = alphaHex(toneColor, '33');

  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
      <Text variant="caption" weight="semibold" style={{ color: toneColor }}>
        {label}
      </Text>
    </View>
  );
}

function KV({ k, v, colors, placeholder }) {
  return (
    <View style={styles.kvRow}>
      <Text variant="bodySmall" color={colors.textMuted} style={styles.kvKey}>
        {k}
      </Text>
      <Text variant="bodySmall" color={colors.textPrimary} style={styles.kvVal}>
        {v || placeholder}
      </Text>
    </View>
  );
}

export function PortalMyOrdersScreen() {
  const { colors } = useTheme();
  const { t, isRTL, locale } = useTranslation();
  const { overview } = usePortalOverview();
  const labels = useMemo(() => ({
    placeholder: t('service.portal.common.placeholder'),
    oneSize: t('service.portal.orders.oneSize'),
    fullKit: t('service.portal.orders.fullKit'),
  }), [t]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const tryOutId = overview?.player?.tryOutId || overview?.player?.id;
  const sheetY = React.useRef(new Animated.Value(40)).current;      // starts slightly down
  const backdropA = React.useRef(new Animated.Value(0)).current;    // starts transparent

  const animateIn = useCallback(() => {
    sheetY.setValue(40);
    backdropA.setValue(0);
    Animated.parallel([
      Animated.timing(backdropA, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropA, sheetY]);

  const animateOut = useCallback((done) => {
    Animated.parallel([
      Animated.timing(backdropA, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: 60,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) done?.();
    });
  }, [backdropA, sheetY]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await portalApi.fetchMyUniformOrders({ try_out: tryOutId });

    if (res?.success) {
      const list = normalizeUniformOrders(res.data);
      setOrders(list);
    } else {
      setError(res?.error?.message || t('service.portal.orders.error'));
    }

    setLoading(false);
  }, [t, tryOutId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const sorted = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return [...list].sort((a, b) => {
      const da = new Date(a?.created_at || 0).getTime();
      const db = new Date(b?.created_at || 0).getTime();
      return db - da;
    });
  }, [orders]);

  const stats = useMemo(() => {
    const list = sorted;
    const total = list.length;
    const pending = list.filter((o) => String(o?.status) === 'pending_payment').length;
    const collected = list.filter((o) => String(o?.status) === 'collected').length;
    return { total, pending, collected };
  }, [sorted]);

  const openDetails = useCallback((order) => {
    setSelected(order);
    setDetailsOpen(true);
    // animate after Modal becomes visible
    requestAnimationFrame(animateIn);
  }, [animateIn]);


  const closeDetails = useCallback(() => {
    animateOut(() => {
      setDetailsOpen(false);
      setSelected(null);
    });
  }, [animateOut]);

  if (loading && orders.length === 0 && !error) {
    return (
      <Screen>
        <SporHiveLoader />
      </Screen>
    );
  }

  return (
    <>
      <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
        <PortalHeader
          title={t('service.portal.orders.title')}
          subtitle={t('service.portal.orders.subtitle')}
        />

        {/* Top summary like ecommerce apps */}
        <View style={styles.summaryRow}>
          <PortalCard style={[styles.summaryCard, styles.summaryCardLeft]}>
            <Text variant="caption" color={colors.textMuted}>
              {t('service.portal.orders.summary.total')}
            </Text>
            <Text variant="title" weight="bold" color={colors.textPrimary} style={styles.summaryValue}>
              {stats.total}
            </Text>
          </PortalCard>

          <PortalCard style={styles.summaryCard}>
            <Text variant="caption" color={colors.textMuted}>
              {t('service.portal.orders.summary.pending')}
            </Text>
            <Text variant="title" weight="bold" color={colors.textPrimary} style={styles.summaryValue}>
              {stats.pending}
            </Text>
          </PortalCard>

          <PortalCard style={[styles.summaryCard, styles.summaryCardRight]}>
            <Text variant="caption" color={colors.textMuted}>
              {t('service.portal.orders.summary.collected')}
            </Text>
            <Text variant="title" weight="bold" color={colors.textPrimary} style={styles.summaryValue}>
              {stats.collected}
            </Text>
          </PortalCard>
        </View>

        {error ? (
          <PortalEmptyState
            icon="alert-triangle"
            title={t('service.portal.orders.errorTitle')}
            description={error}
            action={(
              <Button variant="secondary" onPress={loadOrders}>
                {t('service.portal.common.retry')}
              </Button>
            )}
          />
        ) : sorted.length === 0 ? (
          <PortalEmptyState
            icon="package"
            title={t('service.portal.orders.emptyTitle')}
            description={t('service.portal.orders.emptyDescription')}
          />
        ) : (
          <View style={styles.list}>
            {sorted.map((order, idx) => {
              const title = t('service.portal.orders.orderLabel', { id: order?.id ?? idx + 1 });
              const typeLabel = normalizeTypeLabel(order?.uniform_type, labels);
              const sizeLabel = normalizeSizeLabel(order?.uniform_size, labels);
              const qty = Number(order?.uniform_quantity || 0) || 1;

              const subtitleLeft = t('service.portal.orders.subtitleLeft', { type: typeLabel, qty });
              const subtitleRight = t('service.portal.orders.subtitleRight', { size: sizeLabel });

              return (
                <Pressable
                  key={order?.id ?? `${idx}`}
                  onPress={() => openDetails(order)}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <PortalCard style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardTitleWrap}>
                        <Text variant="body" weight="bold" color={colors.textPrimary} numberOfLines={1}>
                          {title}
                        </Text>
                        <Text variant="caption" color={colors.textMuted} style={styles.cardDate}>
                          {formatDateTime(order?.created_at, locale || 'en', labels.placeholder)}
                        </Text>
                      </View>
                      <StatusPill status={String(order?.status || '')} t={t} colors={colors} />
                    </View>

                    <View style={styles.cardMid}>
                      <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={1}>
                        {subtitleLeft}
                      </Text>
                      <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={1} style={styles.cardMidRight}>
                        {subtitleRight}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                    <View style={[styles.metaChip, { borderColor: alphaHex(colors.border, '66'), backgroundColor: alphaHex(colors.textMuted, '14') }]}>
                      <Text variant="caption" color={colors.textMuted}>
                        {t('service.portal.orders.ref')}
                      </Text>
                        <Text variant="caption" weight="semibold" color={colors.textPrimary}>
                          {order?.additional_payment_ref ? String(order.additional_payment_ref) : labels.placeholder}
                        </Text>
                      </View>

                    <View style={[styles.metaChip, { borderColor: alphaHex(colors.border, '66'), backgroundColor: alphaHex(colors.textMuted, '14') }]}>
                      <Text variant="caption" color={colors.textMuted}>
                        {t('service.portal.orders.player')}
                      </Text>
                        <Text variant="caption" weight="semibold" color={colors.textPrimary}>
                          {order?.player_number ? `#${order.player_number}` : labels.placeholder}
                        </Text>
                      </View>

                    <View style={[styles.metaChip, { borderColor: alphaHex(colors.border, '66'), backgroundColor: alphaHex(colors.textMuted, '14') }]}>
                      <Text variant="caption" color={colors.textMuted}>
                        {t('service.portal.orders.nickname')}
                      </Text>
                        <Text variant="caption" weight="semibold" color={colors.textPrimary} numberOfLines={1}>
                          {order?.nickname ? String(order.nickname) : labels.placeholder}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <Button variant="secondary" size="small" onPress={() => openDetails(order)} style={[styles.actionBtn, styles.actionBtnSolo]}>
                        {t('service.portal.orders.viewDetails')}
                      </Button>
                    </View>
                  </PortalCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </Screen>

      {/* Details “bottom sheet” */}
      <Modal visible={detailsOpen} transparent animationType="none" onRequestClose={closeDetails}>
        <Pressable style={styles.backdrop} onPress={closeDetails}>
          <Animated.View style={[styles.backdropFill, { opacity: backdropA, backgroundColor: alphaHex(colors.black, '73') }]} />

          <Pressable onPress={() => { }} style={styles.sheetTapBlock}>
            <Animated.View
              style={[
                styles.sheet,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated || colors.surface,
                  transform: [{ translateY: sheetY }],
                },
              ]}
            >
              <View style={[styles.sheetHandle, { backgroundColor: alphaHex(colors.textMuted, '59') }]} />
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold" color={colors.textPrimary}>
                    {t('service.portal.orders.details.title')}
                  </Text>
                  <Text variant="caption" color={colors.textMuted}>
                    {selected?.id ? t('service.portal.orders.orderLabel', { id: selected.id }) : labels.placeholder}
                  </Text>
                </View>
                <StatusPill status={String(selected?.status || '')} t={t} colors={colors} />
              </View>

              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <PortalCard style={styles.detailsCard}>
                  <Text variant="bodySmall" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
                    {t('service.portal.orders.details.item')}
                  </Text>

                  <KV k={t('service.portal.orders.details.uniformType')} v={normalizeTypeLabel(selected?.uniform_type, labels)} colors={colors} placeholder={labels.placeholder} />
                  <KV k={t('service.portal.orders.details.size')} v={normalizeSizeLabel(selected?.uniform_size, labels)} colors={colors} placeholder={labels.placeholder} />
                  <KV
                    k={t('service.portal.orders.details.quantity')}
                    v={selected?.uniform_quantity != null ? String(selected.uniform_quantity) : labels.placeholder}
                    colors={colors}
                    placeholder={labels.placeholder}
                  />
                </PortalCard>

                <PortalCard style={styles.detailsCard}>
                  <Text variant="bodySmall" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
                    {t('service.portal.orders.details.player')}
                  </Text>

                  <KV
                    k={t('service.portal.orders.details.playerNumber')}
                    v={selected?.player_number ? `#${selected.player_number}` : labels.placeholder}
                    colors={colors}
                    placeholder={labels.placeholder}
                  />
                  <KV k={t('service.portal.orders.details.nickname')} v={selected?.nickname ? String(selected.nickname) : labels.placeholder} colors={colors} placeholder={labels.placeholder} />
                </PortalCard>

                <PortalCard style={styles.detailsCard}>
                  <Text variant="bodySmall" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
                    {t('service.portal.orders.details.meta')}
                  </Text>

                  <KV k={t('service.portal.orders.details.orderId')} v={selected?.id != null ? String(selected.id) : labels.placeholder} colors={colors} placeholder={labels.placeholder} />
                  <KV k={t('service.portal.orders.details.productId')} v={selected?.product_id != null ? String(selected.product_id) : labels.placeholder} colors={colors} placeholder={labels.placeholder} />
                  <KV k={t('service.portal.orders.details.variantId')} v={selected?.variant_id != null ? String(selected.variant_id) : labels.placeholder} colors={colors} placeholder={labels.placeholder} />
                  <KV
                    k={t('service.portal.orders.details.paymentRef')}
                    v={selected?.additional_payment_ref ? String(selected.additional_payment_ref) : labels.placeholder}
                    colors={colors}
                    placeholder={labels.placeholder}
                  />
                  <KV k={t('service.portal.orders.details.createdAt')} v={formatDateTime(selected?.created_at, locale || 'en', labels.placeholder)} colors={colors} placeholder={labels.placeholder} />
                  <KV k={t('service.portal.orders.details.updatedAt')} v={formatDateTime(selected?.updated_at, locale || 'en', labels.placeholder)} colors={colors} placeholder={labels.placeholder} />
                </PortalCard>

                <View style={styles.sheetFooter}>
                  <Button variant="secondary" onPress={closeDetails} style={styles.footerBtn}>
                    {t('service.portal.common.close')}
                  </Button>
                </View>

                <View style={{ height: Platform.OS === 'ios' ? 10 : 0 }} />
              </ScrollView>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  rtl: {
    direction: 'rtl',
  },

  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  summaryCardLeft: {
    marginLeft: 0,
  },
  summaryCardRight: {
    marginRight: 0,
  },
  summaryValue: {
    marginTop: spacing.xs,
  },

  list: {
    gap: spacing.md,
  },

  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },

  card: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardDate: {
    marginTop: spacing.xs,
  },

  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },

  cardMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  cardMidRight: {
    textAlign: 'right',
  },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metaChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },

  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
  },

  // Modal
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  sheetScroll: {
    paddingHorizontal: spacing.lg,
  },
  sheetScrollContent: {
    paddingBottom: spacing.xl,
  },
  detailsCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  kvKey: {
    flex: 1,
  },
  kvVal: {
    flex: 1,
    textAlign: 'right',
  },

  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footerBtn: {
    flex: 1,
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetTapBlock: {
    width: '100%',
  },
  actionBtnSolo: {
    flex: 1,
  },

});
