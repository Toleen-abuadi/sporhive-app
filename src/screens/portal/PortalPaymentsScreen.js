// src/screens/portal/PortalPaymentsScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Filter, ChevronRight } from 'lucide-react-native';

import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { useI18n } from '../../services/i18n/i18n';
import { PortalFilterSheet } from '../../components/portal/PortalFilterSheet';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { useAuth } from '../../services/auth/auth.store';
import { isPortalReauthError, isPortalForbiddenError } from '../../services/portal/portal.errors';

export function PortalPaymentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { logout } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const {
    payments,
    paymentsLoading,
    paymentsError,
    filters,
  } = usePlayerPortalStore((state) => ({
    payments: state.payments,
    paymentsLoading: state.paymentsLoading,
    paymentsError: state.paymentsError,
    filters: state.filters,
  }));
  const actions = usePlayerPortalActions();

  useEffect(() => {
    actions.hydrateFilters();
  }, [actions]);

  useEffect(() => {
    actions.fetchPayments();
  }, [actions]);

  const filteredPayments = useMemo(() => actions.selectFilteredPayments(), [actions]);

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('portal.filters.statusAll') },
      { value: 'paid', label: t('portal.payments.statusPaid') },
      { value: 'unpaid', label: t('portal.payments.statusUnpaid') },
    ],
    [t]
  );

  const resultsLabel = t('portal.filters.results', { count: filteredPayments.length });

  const needsReauth = isPortalReauthError(paymentsError);
  const isForbidden = isPortalForbiddenError(paymentsError);

  return (
    <PortalAccessGate titleOverride={t('portal.payments.title')}>
      <AppScreen safe scroll={false}>
        <AppHeader
          title={t('portal.payments.title')}
          subtitle={t('portal.payments.subtitle')}
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

        {paymentsLoading && !payments.length ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={`payment-skeleton-${idx}`} height={120} radius={16} />
            ))}
          </View>
        ) : paymentsError ? (
          <EmptyState
           title={isForbidden ? t('portal.errors.forbiddenTitle') : t('portal.payments.errorTitle')}
            message={
              isForbidden
               ? t('portal.errors.forbiddenDescription')
                : (paymentsError?.message || t('portal.payments.errorDescription'))
            }
            actionLabel={needsReauth ? t('portal.errors.reAuthAction') : t('portal.common.retry')}
            onAction={() => {
              if (needsReauth) {
                logout().finally(() => {
                  router.replace('/(auth)/login?mode=player');
                });
                return;
              }
              actions.fetchPayments();
            }}
          />
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            title={t('portal.payments.emptyTitle')}
            message={t('portal.payments.emptyDescription')}
            actionLabel={t('portal.filters.clear')}
            onAction={() => actions.clearFilters('payments')}
          />
        ) : (
          <FlatList
            data={filteredPayments}
            keyExtractor={(item, idx) => String(item?.invoiceId || item?.id || idx)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  const target = item?.invoiceId || item?.id;
                  if (target) {
                    router.push(`/portal/payments/${target}`);
                  }
                }}
              >
                <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" weight="bold" color={colors.textPrimary}>
                        {item?.type || t('portal.payments.defaultTitle')}
                      </Text>
                      <Text variant="caption" color={colors.textSecondary}>
                        {t('portal.payments.dueDate', { date: item?.dueDate || t('portal.common.placeholder') })}
                      </Text>
                    </View>
                    <View style={styles.amountWrap}>
                      <Text variant="body" weight="bold" color={colors.textPrimary}>
                        {item?.amount || 0}
                      </Text>
                      <Text variant="caption" color={colors.textMuted}>
                        {item?.status || t('portal.payments.statusPending')}
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
