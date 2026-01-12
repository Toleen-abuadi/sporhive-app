import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';
import PortalEmptyState from '../../components/portal/PortalEmptyState';

export default function PortalPerformanceScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="Performance" subtitle="Ratings and coach feedback" />

        <PortalCard title="Current rating" subtitle="Latest evaluation window">
          <View style={styles.ratingRow}>
            <Text style={styles.ratingValue}>4.6</Text>
            <Text style={styles.ratingLabel}>Overall score</Text>
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingValue}>Top 12%</Text>
            <Text style={styles.ratingLabel}>Academy ranking</Text>
          </View>
        </PortalCard>

        <PortalEmptyState
          icon="activity"
          title="No feedback yet"
          description="Coach feedback and detailed breakdowns will appear here."
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
  ratingRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEFFC',
    marginBottom: 10,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B1B2D',
  },
  ratingLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#8A89A0',
  },
});
