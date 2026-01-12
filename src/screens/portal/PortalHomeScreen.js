import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';
import PortalListItem from '../../components/portal/PortalListItem';
import PortalEmptyState from '../../components/portal/PortalEmptyState';

export default function PortalHomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="Hi, Player" subtitle="Track your progress and next steps" />

        <PortalCard title="Season overview" subtitle="Your upcoming milestones">
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>4</Text>
              <Text style={styles.metricLabel}>Sessions</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>2</Text>
              <Text style={styles.metricLabel}>Payments</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>86%</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
          </View>
        </PortalCard>

        <PortalCard title="Quick actions" subtitle="Jump back in">
          <View style={styles.listStack}>
            <PortalListItem icon="calendar" label="Upcoming sessions" value="Next training in 2 days" />
            <PortalListItem icon="credit-card" label="Payments" value="View latest invoices" />
            <PortalListItem icon="award" label="Performance" value="Open your rating summary" />
          </View>
        </PortalCard>

        <PortalEmptyState
          icon="bell"
          title="All caught up"
          description="Portal notifications and news will appear here as soon as they land."
        />
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFFC',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B1B2D',
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#8A89A0',
  },
  listStack: {
    gap: 12,
  },
});
