import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';
import PortalEmptyState from '../../components/portal/PortalEmptyState';

export default function PortalFreezesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="Freezes" subtitle="Pause training when needed" />

        <PortalCard title="Freeze policy" subtitle="Flexible options for busy periods">
          <View style={styles.policyRow}>
            <Text style={styles.policyValue}>14 days</Text>
            <Text style={styles.policyLabel}>Max freeze duration</Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyValue}>2</Text>
            <Text style={styles.policyLabel}>Freezes per season</Text>
          </View>
        </PortalCard>

        <PortalEmptyState
          icon="pause-circle"
          title="No active freezes"
          description="Submit a request to pause your membership."
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
  policyRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEFFC',
    marginBottom: 10,
  },
  policyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B1B2D',
  },
  policyLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#8A89A0',
  },
});
