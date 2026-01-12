import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../../components/ui/Text';
import { Screen } from '../../components/ui/Screen';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/portal/portal.api';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { spacing } from '../../theme/tokens';

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (global?.btoa) return global.btoa(binary);
  return binary;
};

export function PortalPaymentsScreen() {
  const { colors } = useTheme();
  const { overview } = usePortalOverview();
  const [downloadingId, setDownloadingId] = useState(null);

  const payments = useMemo(() => {
    // overview.payments is already normalized by normalizePortalOverview
    return Array.isArray(overview?.payments) ? overview.payments : [];
  }, [overview?.payments]);

  // Update the display to show proper status and amounts
  {
    payments.map((payment, index) => (
      <PortalCard key={payment?.id ?? index} style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {payment?.type === 'full' ? 'Full Payment' :
                payment?.type === 'installment' ? 'Installment' :
                  payment?.type || 'Payment'}
              {payment?.subType ? ` (${payment.subType})` : ''}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
              Due {payment?.dueDate || 'Soon'}
              {payment?.status === 'paid' ? ` • Paid on ${payment?.paidOn}` : ''}
            </Text>
          </View>
          <Text variant="body" weight="semibold" color={
            payment?.status === 'paid' ? colors.success :
              payment?.status === 'pending' ? colors.warning :
                colors.textPrimary
          }>
            ${payment?.amount || '0.00'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text variant="caption" color={colors.textMuted}>
            Status
          </Text>
          <View style={[styles.statusBadge, {
            backgroundColor: payment?.status === 'paid' ? colors.success + '20' :
              payment?.status === 'pending' ? colors.warning + '20' :
                colors.border
          }]}>
            <Text variant="caption" weight="medium" color={
              payment?.status === 'paid' ? colors.success :
                payment?.status === 'pending' ? colors.warning :
                  colors.textMuted
            }>
              {payment?.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>
        {payment?.status !== 'paid' && (
          <TouchableOpacity onPress={() => handlePrint(payment)} disabled={downloadingId === payment?.id}>
            <LinearGradient
              colors={[colors.accentOrange, colors.accentOrangeLight || colors.accentOrange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Text variant="bodySmall" weight="semibold" color={colors.white}>
                {downloadingId === payment?.id ? 'Preparing PDF…' : 'Print invoice'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </PortalCard>
    ))
  }
}

export const getPaymentStatusInfo = (status) => {
  const statusLower = (status || '').toLowerCase();
  
  if (statusLower.includes('paid')) {
    return { label: 'PAID', color: 'success', isActionable: false };
  }
  if (statusLower.includes('pending') || statusLower.includes('due')) {
    return { label: 'PENDING', color: 'warning', isActionable: true };
  }
  if (statusLower.includes('overdue')) {
    return { label: 'OVERDUE', color: 'error', isActionable: true };
  }
  
  return { label: status?.toUpperCase() || 'UNKNOWN', color: 'muted', isActionable: false };
};

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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  cta: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
