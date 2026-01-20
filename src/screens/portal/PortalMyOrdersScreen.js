// Portal Orders Screen: premium order history + order details sheet.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Platform, Animated, Easing } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { BackButton } from '../../components/ui/BackButton';
import { portalApi } from '../../services/portal/portal.api';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';
import { normalizeUniformOrders } from '../../services/portal/portal.normalize';

const STATUS_META = {
  pending_payment: { labelKey: 'portal.orders.status.pendingPayment', tone: 'warning' },
  collected: { labelKey: 'portal.orders.status.collected', tone: 'success' },
  processing: { labelKey: 'portal.orders.status.processing', tone: 'info' },
  cancelled: { labelKey: 'portal.orders.status.cancelled', tone: 'danger' },
};

const normalizeSizeLabel = (s) => {
  const v = String(s || '').trim();
  if (!v) return '—';
  if (v === '__one_size__') return 'One size';
  return v;
};

const normalizeTypeLabel = (t) => {
  const v = String(t || '').trim();
  if (!v) return '—';
  return v.toLowerCase() === 'full' ? 'Full kit' : v;
};

const formatDateTime = (iso, locale = 'en') => {
  if (!iso) return '—';
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
  const meta = STATUS_META[status] || { labelKey: 'portal.orders.status.default', tone: 'neutral' };

  const label =
    meta.labelKey && typeof t === 'function'
      ? t(meta.labelKey, { defaultValue: status || t('portal.orders.statusDefault') })
      : status || '—';

  const tone = meta.tone;

  const bg =
    tone === 'success'
      ? 'rgba(34,197,94,0.14)'
      : tone === 'warning'
        ? 'rgba(245,158,11,0.16)'
        : tone === 'danger'
          ? 'rgba(239,68,68,0.14)'
          : tone === 'info'
            ? 'rgba(59,130,246,0.14)'
            : 'rgba(148,163,184,0.14)';

  const border =
    tone === 'success'
      ? 'rgba(34,197,94,0.28)'
      : tone === 'warning'
        ? 'rgba(245,158,11,0.30)'
        : tone === 'danger'
          ? 'rgba(239,68,68,0.28)'
          : tone === 'info'
            ? 'rgba(59,130,246,0.26)'
            : 'rgba(148,163,184,0.24)';

  const text =
    tone === 'success'
      ? '#22C55E'
      : tone === 'warning'
        ? '#F59E0B'
        : tone === 'danger'
          ? '#EF4444'
          : tone === 'info'
            ? '#60A5FA'
            : colors.textSecondary;

  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
      <Text variant="caption" weight="semibold" style={{ color: text }}>
        {label}
      </Text>
    </View>
  );
}

function KV({ k, v, colors }) {
  return (
    <View style={styles.kvRow}>
      <Text variant="bodySmall" color={colors.textMuted} style={styles.kvKey}>
        {k}
      </Text>
      <Text variant="bodySmall" color={colors.textPrimary} style={styles.kvVal}>
        {v || '—'}
      </Text>
    </View>
  );
}

export function PortalMyOrdersScreen() {
  const { colors } = useTheme();
  const { t, isRTL, locale } = useTranslation();
  const { overview } = usePortalOverview();

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
      setError(res?.error?.message || t('portal.orders.error'));
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


  return (
    <>
      <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
        <PortalHeader
          title={t('portal.orders.title')}
          subtitle={t('portal.orders.subtitle')}
          leftSlot={<BackButton />}
        />

        {/* Top summary like ecommerce apps */}
        <View style={styles.summaryRow}>
          <PortalCard style={[styles.summaryCard, styles.summaryCardLeft]}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.orders.summary.total')}
            </Text>
            <Text variant="title" weight="bold" color={colors.textPrimary} style={styles.summaryValue}>
              {stats.total}
            </Text>
          </PortalCard>

          <PortalCard style={styles.summaryCard}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.orders.summary.pending')}
            </Text>
            <Text variant="title" weight="bold" color={colors.textPrimary} style={styles.summaryValue}>
              {stats.pending}
            </Text>
          </PortalCard>

          <PortalCard style={[styles.summaryCard, styles.summaryCardRight]}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.orders.summary.collected')}
            </Text>
            <Text variant="title" weight="bold" color={colors.textPrimary} style={styles.summaryValue}>
              {stats.collected}
            </Text>
          </PortalCard>
        </View>

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
          <PortalEmptyState icon="package" title={t('common.loading')} description={t('portal.orders.loading')} />
        ) : sorted.length === 0 ? (
          <PortalEmptyState
            icon="package"
            title={t('portal.orders.emptyTitle')}
            description={t('portal.orders.emptyDescription')}
          />
        ) : (
          <View style={styles.list}>
            {sorted.map((order, idx) => {
              const title = `${t('portal.orders.order')} #${order?.id ?? idx + 1}`;
              const typeLabel = normalizeTypeLabel(order?.uniform_type);
              const sizeLabel = normalizeSizeLabel(order?.uniform_size);
              const qty = Number(order?.uniform_quantity || 0) || 1;

              const subtitleLeft = `${typeLabel} • ${t('portal.orders.qty')}: ${qty}`;
              const subtitleRight = `${t('portal.orders.size')}: ${sizeLabel}`;

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
                          {formatDateTime(order?.created_at, locale || 'en')}
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
                      <View style={styles.metaChip}>
                        <Text variant="caption" color={colors.textMuted}>
                          {t('portal.orders.ref')}
                        </Text>
                        <Text variant="caption" weight="semibold" color={colors.textPrimary}>
                          {order?.additional_payment_ref ? String(order.additional_payment_ref) : '—'}
                        </Text>
                      </View>

                      <View style={styles.metaChip}>
                        <Text variant="caption" color={colors.textMuted}>
                          {t('portal.orders.player')}
                        </Text>
                        <Text variant="caption" weight="semibold" color={colors.textPrimary}>
                          {order?.player_number ? `#${order.player_number}` : '—'}
                        </Text>
                      </View>

                      <View style={styles.metaChip}>
                        <Text variant="caption" color={colors.textMuted}>
                          {t('portal.orders.nickname')}
                        </Text>
                        <Text variant="caption" weight="semibold" color={colors.textPrimary} numberOfLines={1}>
                          {order?.nickname ? String(order.nickname) : '—'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <Button variant="secondary" size="small" onPress={() => openDetails(order)} style={[styles.actionBtn, styles.actionBtnSolo]}>
                        {t('portal.orders.viewDetails')}
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
          <Animated.View style={[styles.backdropFill, { opacity: backdropA }]} />

          <Pressable onPress={() => { }} style={styles.sheetTapBlock}>
            <Animated.View
              style={[
                styles.sheet,
                { borderColor: colors.border, transform: [{ translateY: sheetY }] },
              ]}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold" color={colors.textPrimary}>
                    {t('portal.orders.detailsTitle')}
                  </Text>
                  <Text variant="caption" color={colors.textMuted}>
                    {selected?.id ? `${t('portal.orders.order')} #${selected.id}` : '—'}
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
                    {t('portal.orders.details.item')}
                  </Text>

                  <KV k={t('portal.orders.details.uniformType')} v={normalizeTypeLabel(selected?.uniform_type)} colors={colors} />
                  <KV k={t('portal.orders.details.size')} v={normalizeSizeLabel(selected?.uniform_size)} colors={colors} />
                  <KV
                    k={t('portal.orders.details.quantity')}
                    v={selected?.uniform_quantity != null ? String(selected.uniform_quantity) : '—'}
                    colors={colors}
                  />
                </PortalCard>

                <PortalCard style={styles.detailsCard}>
                  <Text variant="bodySmall" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
                    {t('portal.orders.details.player')}
                  </Text>

                  <KV
                    k={t('portal.orders.details.playerNumber')}
                    v={selected?.player_number ? `#${selected.player_number}` : '—'}
                    colors={colors}
                  />
                  <KV k={t('portal.orders.details.nickname')} v={selected?.nickname ? String(selected.nickname) : '—'} colors={colors} />
                </PortalCard>

                <PortalCard style={styles.detailsCard}>
                  <Text variant="bodySmall" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
                    {t('portal.orders.details.meta')}
                  </Text>

                  <KV k={t('portal.orders.details.orderId')} v={selected?.id != null ? String(selected.id) : '—'} colors={colors} />
                  <KV k={t('portal.orders.details.productId')} v={selected?.product_id != null ? String(selected.product_id) : '—'} colors={colors} />
                  <KV k={t('portal.orders.details.variantId')} v={selected?.variant_id != null ? String(selected.variant_id) : '—'} colors={colors} />
                  <KV
                    k={t('portal.orders.details.paymentRef')}
                    v={selected?.additional_payment_ref ? String(selected.additional_payment_ref) : '—'}
                    colors={colors}
                  />
                  <KV k={t('portal.orders.details.createdAt')} v={formatDateTime(selected?.created_at, locale || 'en')} colors={colors} />
                  <KV k={t('portal.orders.details.updatedAt')} v={formatDateTime(selected?.updated_at, locale || 'en')} colors={colors} />
                </PortalCard>

                <View style={styles.sheetFooter}>
                  <Button variant="secondary" onPress={closeDetails} style={styles.footerBtn}>
                    {t('common.close')}
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
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(148,163,184,0.08)',
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
    backgroundColor: '#0F1A2E',
    paddingTop: spacing.sm,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.35)',
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetTapBlock: {
    width: '100%',
  },
  actionBtnSolo: {
    flex: 1,
  },

});
