import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';

export default function PortalNewsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="Academy News" subtitle="Updates and announcements" />

        <PortalCard title="Featured" subtitle="What’s new this week">
          <View style={styles.newsCard}>
            <Text style={styles.newsTitle}>Summer tournament schedule released</Text>
            <Text style={styles.newsMeta}>Posted 3 hours ago</Text>
          </View>
          <View style={styles.newsCard}>
            <Text style={styles.newsTitle}>New recovery lounge opens</Text>
            <Text style={styles.newsMeta}>Posted yesterday</Text>
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
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFFC',
    marginBottom: 10,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B1B2D',
  },
  newsMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#8A89A0',
  },
});
