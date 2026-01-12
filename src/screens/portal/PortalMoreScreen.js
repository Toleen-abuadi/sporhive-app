import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';
import PortalListItem from '../../components/portal/PortalListItem';

export default function PortalMoreScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="More" subtitle="Explore extra portal services" />

        <PortalCard title="Services" subtitle="Everything in one place">
          <View style={styles.listStack}>
            <PortalListItem icon="pause-circle" label="Freezes" value="Pause membership" onPress={() => router.push('/portal/freezes')} />
            <PortalListItem icon="activity" label="Performance" value="Ratings & metrics" onPress={() => router.push('/portal/performance')} />
            <PortalListItem icon="shopping-bag" label="Uniform store" value="Shop gear" onPress={() => router.push('/portal/uniform-store')} />
            <PortalListItem icon="package" label="My orders" value="Track deliveries" onPress={() => router.push('/portal/my-orders')} />
            <PortalListItem icon="bell" label="News" value="Latest updates" onPress={() => router.push('/portal/news')} />
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
  listStack: {
    gap: 12,
  },
});
