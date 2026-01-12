import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';
import PortalListItem from '../../components/portal/PortalListItem';

export default function PortalUniformStoreScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="Uniform Store" subtitle="Shop academy-approved gear" />

        <PortalCard title="Featured drop" subtitle="Limited edition kit">
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>2026 Pro Training Set</Text>
            <Text style={styles.featureSubtitle}>Available in all sizes</Text>
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>$85</Text>
            </View>
          </View>
        </PortalCard>

        <PortalCard title="Categories" subtitle="Browse essentials">
          <View style={styles.listStack}>
            <PortalListItem icon="shopping-bag" label="Training kits" value="12 items" />
            <PortalListItem icon="shield" label="Protective gear" value="8 items" />
            <PortalListItem icon="package" label="Accessories" value="20 items" />
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
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFFC',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B1B2D',
  },
  featureSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#8A89A0',
  },
  priceTag: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#F1EEFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B5CF6',
  },
  listStack: {
    gap: 12,
  },
});
