// src/screens/portal/PortalPaymentsScreen.js
import React, { useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { usePortalPayments } from '../../services/portal/portal.hooks';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { useTheme } from '../../theme/ThemeProvider';

function formatMoney(amount, currency) {
  const a = Number(amount || 0);
  const c = currency || 'JOD';
  return `${a.toFixed(2)} ${c}`;
}

function formatDate(dateString) {
  if (!dateString || dateString === 'Not paid') return 'No date';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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
    return colors.success || '#10B981'; // green
  }
  
  if (statusLower.includes('pending')) {
    // Check if overdue
    if (statusLower.includes('overdue') || statusLower.includes('due')) {
      return colors.error || '#EF4444'; // red
    }
    return colors.warning || '#F59E0B'; // orange
  }
  
  if (statusLower.includes('due')) {
    return colors.error || '#EF4444'; // red
  }
  
  return colors.text || '#000000'; // default
}

function getStatusText(status) {
  const statusLower = (status || '').toLowerCase();
  
  if (statusLower.includes('paid')) return 'Paid';
  if (statusLower.includes('pending')) return 'Pending';
  if (statusLower.includes('due')) return 'Due';
  return status || 'Unknown';
}

function getDisplayDate(item) {
  // If paid, show paid date
  if (item.status?.toLowerCase().includes('paid') && item.paidOn && item.paidOn !== 'Not paid') {
    return `Paid on ${formatDate(item.paidOn)}`;
  }
  
  // Otherwise show due date
  if (item.dueDate) {
    return `Due on ${formatDate(item.dueDate)}`;
  }
  
  return 'No date specified';
}

function PaymentRow({ item }) {
  const { colors } = useTheme();
  
  // Determine status color
  const statusColor = getStatusColor(item.status, colors);
  
  // Get payment type/description
  const getPaymentType = () => {
    if (item.type === 'full' && item.subType === 'additional_uniform') {
      return 'Uniform Purchase';
    }
    if (item.type === 'full') {
      return 'Full Payment';
    }
    if (item.type === 'installment') {
      return `Installment ${item.subType || ''}`.trim();
    }
    return item.type || 'Payment';
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
            <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>
              {paymentType}
            </Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: statusColor + '20' } // 20 = 12% opacity
            ]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>{formatMoney(item.amount)}</Text>
            </View>
            
            {item.invoiceId && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Invoice:</Text>
                <Text style={styles.detailValue}>#{item.invoiceId}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>
              {getDisplayDate(item)}
            </Text>
            
            {item.paymentMethod && (
              <Text style={styles.methodText}>
                • {item.paymentMethod}
              </Text>
            )}
          </View>
          
          {item.fees && (
            <View style={styles.feesRow}>
              {item.fees.trainingFees > 0 && (
                <Text style={styles.feeText}>Training: {formatMoney(item.fees.trainingFees)}</Text>
              )}
              {item.fees.uniformFees > 0 && (
                <Text style={styles.feeText}>Uniform: {formatMoney(item.fees.uniformFees)}</Text>
              )}
              {item.fees.transportationFees > 0 && (
                <Text style={styles.feeText}>Transport: {formatMoney(item.fees.transportationFees)}</Text>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.rightColumn}>
          <Text style={[
            styles.amount, 
            { color: item.status?.toLowerCase().includes('paid') ? colors.success : colors.text }
          ]}>
            {formatMoney(item.amount)}
          </Text>
        </View>
      </View>
    </PortalCard>
  );
}

export function PortalPaymentsScreen() {
  const { colors } = useTheme();
  const { payments, loading, error, reload } = usePortalPayments();

  const onRefresh = useCallback(() => {
    reload();
  }, [reload]);

  const listEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <PortalEmptyState
        title="No payments yet"
        subtitle={
          error
            ? `Failed to load payments: ${error.message || error}`
            : 'When you pay for subscriptions or orders, they\'ll appear here.'
        }
      />
    );
  }, [loading, error]);

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

  return (
    <Screen>
      <PortalHeader title="Payments" subtitle="Invoices, transactions, and receipts" />
      
      {summary && (
        <View style={styles.summaryContainer}>
          <PortalCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {summary.paidCount}
                </Text>
                <Text style={styles.summaryLabel}>Paid</Text>
                <Text style={styles.summaryAmount}>
                  {formatMoney(summary.totalPaid)}
                </Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.warning }]}>
                  {summary.pendingCount}
                </Text>
                <Text style={styles.summaryLabel}>Pending</Text>
                <Text style={styles.summaryAmount}>
                  {formatMoney(summary.totalPending)}
                </Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {summary.overdueCount}
                </Text>
                <Text style={styles.summaryLabel}>Overdue</Text>
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
          />
        }
        ListHeaderComponent={
          payments?.length && error ? (
            <View style={{ marginBottom: 10 }}>
              <PortalCard>
                <Text style={{ color: colors.warning ?? '#F59E0B' }}>
                  Note: {error.message || error}
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
    backgroundColor: '#E5E7EB',
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
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
  },
});