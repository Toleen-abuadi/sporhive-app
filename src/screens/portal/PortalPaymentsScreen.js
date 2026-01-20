// src/screens/portal/PortalPaymentsScreen.js
import React, { useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { usePortalPayments } from '../../services/portal/portal.hooks';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { useTheme } from '../../theme/ThemeProvider';
import { useTranslation } from '../../services/i18n/i18n';

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

function formatMoney(amount, currency) {
  const a = Number(amount || 0);
  const c = currency || 'JOD';
  return `${a.toFixed(2)} ${c}`;
}

function formatDate(dateString, locale, { notPaidToken, noDateLabel }) {
  if (!dateString || dateString === notPaidToken) {
    return noDateLabel;
  }
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale || 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function getStatusColor(status, colors) {
  const statusLower = (status || '').toLowerCase();
  
  if (statusLower.includes('paid')) {
    return colors.success;
  }
  
  if (statusLower.includes('pending')) {
    // Check if overdue
    if (statusLower.includes('overdue') || statusLower.includes('due')) {
      return colors.error;
    }
    return colors.warning;
  }
  
  if (statusLower.includes('due')) {
    return colors.error;
  }
  
  return colors.textPrimary;
}

function getStatusText(status, t) {
  const statusLower = (status || '').toLowerCase();
  
  if (statusLower.includes('paid')) return t('service.portal.payments.status.paid');
  if (statusLower.includes('pending')) return t('service.portal.payments.status.pending');
  if (statusLower.includes('due')) return t('service.portal.payments.status.due');
  return status || t('service.portal.payments.status.unknown');
}

function getDisplayDate(item, locale, labels) {
  // If paid, show paid date
  if (item.status?.toLowerCase().includes('paid') && item.paidOn && item.paidOn !== labels.notPaidToken) {
    return labels.paidOn({ date: formatDate(item.paidOn, locale, labels) });
  }
  
  // Otherwise show due date
  if (item.dueDate) {
    return labels.dueOn({ date: formatDate(item.dueDate, locale, labels) });
  }
  
  return labels.noDateSpecified;
}

function PaymentRow({ item }) {
  const { colors } = useTheme();
  const { t, locale } = useTranslation();
  const labels = useMemo(() => ({
    notPaidToken: t('service.portal.payments.notPaidToken'),
    noDateLabel: t('service.portal.payments.noDate'),
    noDateSpecified: t('service.portal.payments.noDateSpecified'),
    paidOn: (params) => t('service.portal.payments.paidOn', params),
    dueOn: (params) => t('service.portal.payments.dueOn', params),
  }), [t]);
  
  // Determine status color
  const statusColor = getStatusColor(item.status, colors);
  
  // Get payment type/description
  const getPaymentType = () => {
    if (item.type === 'full' && item.subType === 'additional_uniform') {
      return t('service.portal.payments.type.uniformPurchase');
    }
    if (item.type === 'full') {
      return t('service.portal.payments.type.fullPayment');
    }
    if (item.type === 'installment') {
      return t('service.portal.payments.type.installment', { label: item.subType || '' }).trim();
    }
    return item.type || t('service.portal.payments.type.payment');
  };
  
  const paymentType = getPaymentType();
  
  return (
    <PortalCard style={{ 
      marginBottom: 12, 
      borderLeftWidth: 4,
      borderLeftColor: statusColor,
      paddingLeft: 12 
    }}>
      <View style={styles.rowContainer}>
        <View style={styles.leftColumn}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { flex: 1, color: colors.textPrimary }]} numberOfLines={1}>
              {paymentType}
            </Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: alphaHex(statusColor, '20') }
            ]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(item.status, t)}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('service.portal.payments.amount')}</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatMoney(item.amount, t('service.portal.payments.currency'))}</Text>
            </View>
            
            {item.invoiceId && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('service.portal.payments.invoice')}</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>#{item.invoiceId}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.dateRow}>
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {getDisplayDate(item, locale, labels)}
            </Text>
            
            {item.paymentMethod && (
              <Text style={[styles.methodText, { color: colors.textSecondary }]}>
                {t('service.portal.payments.method', { method: item.paymentMethod })}
              </Text>
            )}
          </View>
          
          {item.fees && (
            <View style={styles.feesRow}>
              {item.fees.trainingFees > 0 && (
                <Text style={[styles.feeText, { backgroundColor: alphaHex(colors.surfaceElevated || colors.surface, 'CC'), color: colors.textSecondary }]}>
                  {t('service.portal.payments.fees.training', { amount: formatMoney(item.fees.trainingFees, t('service.portal.payments.currency')) })}
                </Text>
              )}
              {item.fees.uniformFees > 0 && (
                <Text style={[styles.feeText, { backgroundColor: alphaHex(colors.surfaceElevated || colors.surface, 'CC'), color: colors.textSecondary }]}>
                  {t('service.portal.payments.fees.uniform', { amount: formatMoney(item.fees.uniformFees, t('service.portal.payments.currency')) })}
                </Text>
              )}
              {item.fees.transportationFees > 0 && (
                <Text style={[styles.feeText, { backgroundColor: alphaHex(colors.surfaceElevated || colors.surface, 'CC'), color: colors.textSecondary }]}>
                  {t('service.portal.payments.fees.transport', { amount: formatMoney(item.fees.transportationFees, t('service.portal.payments.currency')) })}
                </Text>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.rightColumn}>
          <Text style={[
            styles.amount, 
            { color: item.status?.toLowerCase().includes('paid') ? colors.success : colors.textPrimary }
          ]}>
            {formatMoney(item.amount, t('service.portal.payments.currency'))}
          </Text>
        </View>
      </View>
    </PortalCard>
  );
}

export function PortalPaymentsScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const { payments, loading, error, reload } = usePortalPayments();

  const onRefresh = useCallback(() => {
    reload();
  }, [reload]);

  const listEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <PortalEmptyState
        title={t('service.portal.payments.empty.title')}
        subtitle={
          error
            ? t('service.portal.payments.empty.error', { message: error.message || error })
            : t('service.portal.payments.empty.subtitle')
        }
      />
    );
  }, [loading, error, t]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!payments?.length) return null;
    
    const paid = payments.filter(p => p.status?.toLowerCase().includes('paid'));
    const pending = payments.filter(p => 
      p.status?.toLowerCase().includes('pending') || 
      p.status?.toLowerCase().includes('due')
    );
    const overdue = payments.filter(p => 
      p.dueDate && 
      new Date(p.dueDate) < new Date() && 
      !p.status?.toLowerCase().includes('paid')
    );
    
    const totalPaid = paid.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalPending = pending.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    return {
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      totalPaid,
      totalPending
    };
  }, [payments]);

  if (loading && (!payments || payments.length === 0) && !error) {
    return (
      <Screen>
        <SporHiveLoader />
      </Screen>
    );
  }

  return (
    <Screen style={isRTL && styles.rtl}>
      <PortalHeader
        title={t('service.portal.payments.title')}
        subtitle={t('service.portal.payments.subtitle')}
      />
      
      {summary && (
        <View style={styles.summaryContainer}>
          <PortalCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {summary.paidCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('service.portal.payments.summary.paid')}</Text>
                <Text style={[styles.summaryAmount, { color: colors.textPrimary }]}>
                  {formatMoney(summary.totalPaid, t('service.portal.payments.currency'))}
                </Text>
              </View>
              
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.warning }]}>
                  {summary.pendingCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('service.portal.payments.summary.pending')}</Text>
                <Text style={[styles.summaryAmount, { color: colors.textPrimary }]}>
                  {formatMoney(summary.totalPending, t('service.portal.payments.currency'))}
                </Text>
              </View>
              
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {summary.overdueCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('service.portal.payments.summary.overdue')}</Text>
              </View>
            </View>
          </PortalCard>
        </View>
      )}

      <FlatList
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 28 },
          payments?.length ? null : { flex: 1 },
        ]}
        data={payments || []}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item }) => <PaymentRow item={item} />}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={onRefresh} 
            tintColor={colors.accentOrange}
          />
        }
        ListHeaderComponent={
          payments?.length && error ? (
            <View style={{ marginBottom: 10 }}>
              <PortalCard>
                <Text style={{ color: colors.warning }}>
                  {t('service.portal.payments.errorNote', { message: error.message || error })}
                </Text>
              </PortalCard>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rtl: {
    direction: 'rtl',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryCard: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 13,
    opacity: 0.9,
  },
  methodText: {
    fontSize: 13,
    opacity: 0.7,
    marginLeft: 6,
  },
  feesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  feeText: {
    fontSize: 11,
    opacity: 0.6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
  },
});
