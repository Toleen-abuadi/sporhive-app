import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalListItem } from '../../components/portal/PortalListItem';
import { spacing } from '../../theme/tokens';

export function PortalMoreScreen() {
  const router = useRouter();

  return (
    <Screen scroll contentContainerStyle={styles.scroll}>
      <PortalHeader title="More" subtitle="Everything else in your portal" />

      <View style={styles.list}>
        <PortalListItem
          leadingIcon="pause-circle"
          title="Freezes"
          subtitle="Pause your subscription"
          onPress={() => router.push('/portal/freezes')}
        />
        <PortalListItem
          leadingIcon="trending-up"
          title="Performance"
          subtitle="Coach ratings & insights"
          onPress={() => router.push('/portal/performance')}
        />
        <PortalListItem
          leadingIcon="shopping-bag"
          title="Uniform store"
          subtitle="Latest kits and gear"
          onPress={() => router.push('/portal/uniform-store')}
        />
        <PortalListItem
          leadingIcon="package"
          title="My orders"
          subtitle="Track deliveries"
          onPress={() => router.push('/portal/my-orders')}
        />
        <PortalListItem
          leadingIcon="volume-2"
          title="News"
          subtitle="Academy updates"
          onPress={() => router.push('/portal/news')}
        />
        <PortalListItem
          leadingIcon="credit-card"
          title="Payments"
          subtitle="Invoices and receipts"
          onPress={() => router.push('/portal/payments')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
});
