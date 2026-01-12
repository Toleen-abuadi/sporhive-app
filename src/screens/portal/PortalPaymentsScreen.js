import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';
import PortalListItem from '../../components/portal/PortalListItem';

export default function PortalPaymentsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="Payments" subtitle="Invoices and transaction history" />

        <PortalCard title="Upcoming invoice" subtitle="Next payment window">
          <View style={styles.invoiceRow}>
            <View>
              <Text style={styles.invoiceAmount}>$120</Text>
              <Text style={styles.invoiceMeta}>Due on 24 Aug 2026</Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusText}>Pending</Text>
            </View>
          </View>
        </PortalCard>

        <PortalCard title="Recent activity" subtitle="Last 3 transactions">
          <View style={styles.listStack}>
            <PortalListItem icon="file-text" label="May 2026 invoice" value="Paid" />
            <PortalListItem icon="file-text" label="Apr 2026 invoice" value="Paid" />
            <PortalListItem icon="file-text" label="Mar 2026 invoice" value="Paid" />
          </View>
        </PortalCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F5FA',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B1B2D',
  },
  invoiceMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#8A89A0',
  },
  statusChip: {
    backgroundColor: '#FFF4E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#D47330',
    fontWeight: '600',
  },
  listStack: {
    gap: 12,
  },
});
