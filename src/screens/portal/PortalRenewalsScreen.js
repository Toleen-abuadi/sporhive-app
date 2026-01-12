import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';
import PortalEmptyState from '../../components/portal/PortalEmptyState';

export default function PortalRenewalsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="Renewals" subtitle="Stay on top of registration windows" />

        <PortalCard title="Current cycle" subtitle="Membership renewal status">
          <View style={styles.highlight}>
            <Text style={styles.highlightTitle}>Registration window opens soon</Text>
            <Text style={styles.highlightSubtitle}>We will notify you 7 days before your renewal is due.</Text>
          </View>
        </PortalCard>

        <PortalEmptyState
          icon="calendar"
          title="No renewal requests"
          description="Your renewal requests will show here once submitted."
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
  highlight: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFEFFC',
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B1B2D',
  },
  highlightSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#87869C',
  },
});
