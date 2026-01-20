import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalListItem } from '../../components/portal/PortalListItem';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

export function PortalMoreScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader title={t('portal.more.title')} subtitle={t('portal.more.subtitle')} />

      <View style={styles.list}>
        <PortalListItem
          leadingIcon="pause-circle"
          title={t('portal.more.freezes.title')}
          subtitle={t('portal.more.freezes.subtitle')}
          onPress={() => router.push('/portal/freezes')}
        />
        <PortalListItem
          leadingIcon="trending-up"
          title={t('portal.more.performance.title')}
          subtitle={t('portal.more.performance.subtitle')}
          onPress={() => router.push('/portal/performance')}
        />
        <PortalListItem
          leadingIcon="shopping-bag"
          title={t('portal.more.uniforms.title')}
          subtitle={t('portal.more.uniforms.subtitle')}
          onPress={() => router.push('/portal/uniform-store')}
        />
        <PortalListItem
          leadingIcon="package"
          title={t('portal.more.orders.title')}
          subtitle={t('portal.more.orders.subtitle')}
          onPress={() => router.push('/portal/my-orders')}
        />
        <PortalListItem
          leadingIcon="volume-2"
          title={t('portal.more.news.title')}
          subtitle={t('portal.more.news.subtitle')}
          onPress={() => router.push('/portal/news')}
        />
        <PortalListItem
          leadingIcon="credit-card"
          title={t('portal.more.payments.title')}
          subtitle={t('portal.more.payments.subtitle')}
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
  rtl: {
    direction: 'rtl',
  },
  list: {
    gap: spacing.sm,
  },
});
