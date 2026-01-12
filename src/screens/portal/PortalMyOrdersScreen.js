import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';
import PortalListItem from '../../components/portal/PortalListItem';
import PortalEmptyState from '../../components/portal/PortalEmptyState';

export default function PortalMyOrdersScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="My Orders" subtitle="Track delivery status" />

        <PortalCard title="Latest orders" subtitle="Recent purchases">
          <View style={styles.listStack}>
            <PortalListItem icon="package" label="Training kit" value="In transit" />
            <PortalListItem icon="package" label="Goalkeeper gloves" value="Delivered" />
          </View>
        </PortalCard>

        <PortalEmptyState
          icon="shopping-bag"
          title="No returns"
          description="Return details will show here if you start a request."
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
  listStack: {
    gap: 12,
  },
});
