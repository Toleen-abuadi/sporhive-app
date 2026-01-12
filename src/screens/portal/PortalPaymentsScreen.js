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
    const list = Array.isArray(overview?.payments) ? overview.payments : [];
    return list;
  }, [overview?.payments]);

  const handlePrint = async (payment) => {
    try {
      setDownloadingId(payment?.id || 'loading');
      const res = await portalApi.printInvoice({ invoice_id: payment?.id });
      if (!res?.success) return;
      const base64 = arrayBufferToBase64(res.data);
      const fileUri = `${FileSystem.cacheDirectory}invoice-${payment?.id || Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        await Linking.openURL(fileUri);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Screen scroll contentContainerStyle={styles.scroll}>
      <PortalHeader title="Payments" subtitle="Invoices, receipts, and schedules" />

      {payments.length === 0 ? (
        <PortalEmptyState
          icon="credit-card"
          title="No invoices yet"
          description="Your upcoming invoices will appear here once generated."
        />
      ) : (
        <View style={styles.list}>
          {payments.map((payment, index) => (
            <PortalCard key={payment?.id ?? index} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text variant="body" weight="semibold" color={colors.textPrimary}>
                    {payment?.title || 'Monthly invoice'}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
                    Due {payment?.dueDate || 'Soon'}
                  </Text>
                </View>
                <Text variant="body" weight="semibold" color={colors.textPrimary}>
                  {payment?.amount || '—'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text variant="caption" color={colors.textMuted}>
                  Status
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {payment?.status || 'Pending'}
                </Text>
              </View>
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
});
