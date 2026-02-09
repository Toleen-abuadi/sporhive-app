import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalListItem } from '../../components/portal/PortalListItem';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../services/auth/auth.store';

function Section({ title, children, colors }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" weight="bold" color={colors.textMuted}>{title}</Text>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

export function PortalMoreScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const { logout } = useAuth();

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader title={t('portal.more.title')} subtitle={t('portal.more.subtitle')} />

      <Section title="Account" colors={colors}>
        <PortalListItem leadingIcon="user" title={t('portal.profile.title')} subtitle={t('portal.profile.subtitle')} onPress={() => router.push('/portal/profile')} />
        <PortalListItem leadingIcon="credit-card" title={t('portal.more.payments.title')} subtitle={t('portal.more.payments.subtitle')} onPress={() => router.push('/portal/payments')} />
        <PortalListItem leadingIcon="pause-circle" title={t('portal.more.freezes.title')} subtitle={t('portal.more.freezes.subtitle')} onPress={() => router.push('/portal/freezes')} />
      </Section>

      <Section title="Support" colors={colors}>
        <PortalListItem leadingIcon="trending-up" title={t('portal.more.performance.title')} subtitle={t('portal.more.performance.subtitle')} onPress={() => router.push('/portal/performance')} />
        <PortalListItem leadingIcon="volume-2" title={t('portal.more.news.title')} subtitle={t('portal.more.news.subtitle')} onPress={() => router.push('/portal/news')} />
      </Section>

      <Section title="About" colors={colors}>
        <PortalListItem leadingIcon="shopping-bag" title={t('portal.more.uniforms.title')} subtitle={t('portal.more.uniforms.subtitle')} onPress={() => router.push('/portal/uniform-store')} />
        <PortalListItem leadingIcon="package" title={t('portal.more.orders.title')} subtitle={t('portal.more.orders.subtitle')} onPress={() => router.push('/portal/my-orders')} />
      </Section>

      <Section title="Settings" colors={colors}>
        <PortalListItem
          leadingIcon="log-out"
          title={t('auth.logout') || 'Log out'}
          subtitle="Sign out from Player Portal"
          onPress={() => logout().finally(() => router.replace('/(auth)/login?mode=player'))}
          style={{ borderColor: colors.error, backgroundColor: `${colors.error}11` }}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg },
  rtl: { direction: 'rtl' },
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
});
