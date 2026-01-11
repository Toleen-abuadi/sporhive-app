// src/screens/portal/PaymentsScreen.js
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { usePortal, usePortalRefresh } from '../../services/portal/portal.hooks';
import { selectPaymentsSorted } from '../../services/portal/portal.store';
import { formatDate, formatMoney } from '../../services/portal/portal.normalize';
import { colors, spacing, radius, typography } from '../../theme/portal.styles';
import { PortalCard, PortalHeader, PortalScreen, PortalEmptyState, Pill } from '../../components/portal/PortalPrimitives';

const statusTone = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('paid')) return 'success';
  if (s.includes('pending') || s.includes('due')) return 'warning';
  return 'neutral';
};

export default function PaymentsScreen() {
  const { overview, loading } = usePortal();
  const { refreshing, onRefresh } = usePortalRefresh();

  const [expanded, setExpanded] = useState({});

  const payments = useMemo(() => selectPaymentsSorted(overview), [overview]);

  const toggleExpanded = useCallback((id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const renderItem = ({ item }) => {
    const id = item?.id || item?.invoiceId || item?.dueDate || Math.random().toString();
    const isOpen = !!expanded[id];
    const fees = item?.fees || {};
    const feeEntries = Object.entries(fees || {});

    return (
      <PortalCard style={styles.card}>
        <Pressable onPress={() => toggleExpanded(id)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {item?.type || item?.subType || 'Payment'}
            </Text>
            <Text style={styles.sub}>
              {item?.dueDate ? `Due ${formatDate(item.dueDate)}` : '—'}
              {item?.paidOn ? ` • Paid ${formatDate(item.paidOn)}` : ''}
            </Text>
            {!!item?.paymentMethod && (
              <Text style={styles.sub}>Method: {item.paymentMethod}</Text>
            )}
          </View>
          <View style={styles.meta}>
            <Pill label={item?.status || '—'} tone={statusTone(item?.status)} small />
            <Text style={styles.amount}>{formatMoney(item?.amount) || item?.amount}</Text>
            <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
          </View>
        </Pressable>

        {isOpen && (
          <Animated.View entering={FadeInUp.duration(180)} style={styles.fees}>
            {feeEntries.length ? (
              feeEntries.map(([key, value]) => (
                <View key={key} style={styles.feeRow}>
                  <Text style={styles.feeLabel}>{key}</Text>
                  <Text style={styles.feeValue}>{formatMoney(value) || value}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.sub}>No fee breakdown available.</Text>
            )}
          </Animated.View>
        )}
      </PortalCard>
    );
  };

  return (
    <PortalScreen>
      <PortalHeader title="Payments" subtitle={overview?.academyName || ''} />

      {!overview && !loading ? (
        <PortalEmptyState
          title="No payments"
          message="Pull to refresh to load your payment history."
          action={onRefresh}
          actionLabel="Refresh"
        />
      ) : payments.length ? (
        <FlatList
          data={payments}
          keyExtractor={(item, idx) => String(item?.id || item?.invoiceId || item?.dueDate || idx)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: spacing.screenPadding, paddingBottom: 120 }}
        />
      ) : (
        <PortalEmptyState
          title="No payments"
          message="No payment records were found in your overview."
          action={onRefresh}
          actionLabel="Refresh"
        />
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    marginTop: 4,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
  },
  fees: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  feeLabel: {
    color: colors.textTertiary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
    textTransform: 'capitalize',
  },
  feeValue: {
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
});
