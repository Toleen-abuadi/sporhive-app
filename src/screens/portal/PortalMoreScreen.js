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
import { PortalCard } from '../../components/portal/PortalCard';

function Section({ title, subtitle, children, colors }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="bodySmall" weight="bold" color={colors.textPrimary}>{title}</Text>
        {!!subtitle ? <Text variant="caption" color={colors.textMuted}>{subtitle}</Text> : null}
      </View>
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

      <PortalCard style={styles.infoCard}>
        <Text variant="bodySmall" weight="semibold" color={colors.textPrimary}>{t('portal.more.startHereTitle')}</Text>
        <Text variant="caption" color={colors.textSecondary}>{t('portal.more.startHereDescription')}</Text>
      </PortalCard>

      <Section title={t('portal.more.sections.account.title')} subtitle={t('portal.more.sections.account.subtitle')} colors={colors}>
        <PortalListItem leadingIcon="user" title={t('portal.profile.title')} subtitle={t('portal.profile.subtitle')} onPress={() => router.push('/portal/profile')} />
        <PortalListItem leadingIcon="credit-card" title={t('portal.more.payments.title')} subtitle={t('portal.more.payments.subtitle')} onPress={() => router.push('/portal/payments')} />
        <PortalListItem leadingIcon="pause-circle" title={t('portal.more.freezes.title')} subtitle={t('portal.more.freezes.subtitle')} onPress={() => router.push('/portal/freezes')} />
      </Section>

      <Section title={t('portal.more.sections.support.title')} subtitle={t('portal.more.sections.support.subtitle')} colors={colors}>
        <PortalListItem leadingIcon="trending-up" title={t('portal.more.performance.title')} subtitle={t('portal.more.performance.subtitle')} onPress={() => router.push('/portal/performance')} />
        <PortalListItem leadingIcon="volume-2" title={t('portal.more.news.title')} subtitle={t('portal.more.news.subtitle')} onPress={() => router.push('/portal/news')} />
      </Section>

      <Section title={t('portal.more.sections.about.title')} subtitle={t('portal.more.sections.about.subtitle')} colors={colors}>
        <PortalListItem leadingIcon="shopping-bag" title={t('portal.more.uniforms.title')} subtitle={t('portal.more.uniforms.subtitle')} onPress={() => router.push('/portal/uniform-store')} />
        <PortalListItem leadingIcon="package" title={t('portal.more.orders.title')} subtitle={t('portal.more.orders.subtitle')} onPress={() => router.push('/portal/my-orders')} />
      </Section>

      <Section title={t('portal.more.sections.legal.title')} subtitle={t('portal.more.sections.legal.subtitle')} colors={colors}>
        <PortalListItem leadingIcon="shield" title={t('portal.more.legal.privacyTitle')} subtitle={t('portal.more.legal.privacySubtitle')} />
        <PortalListItem leadingIcon="file-text" title={t('portal.more.legal.termsTitle')} subtitle={t('portal.more.legal.termsSubtitle')} />
      </Section>

      <Section title={t('portal.more.sections.settings.title')} subtitle={t('portal.more.sections.settings.subtitle')} colors={colors}>
        <PortalListItem leadingIcon="settings" title={t('portal.more.settings.portalSettingsTitle')} subtitle={t('portal.more.settings.portalSettingsSubtitle')} />
      </Section>

      <View style={[styles.dangerWrap, { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}>
        <Text variant="caption" weight="bold" color={colors.error}>{t('portal.more.destructiveTitle')}</Text>
        <PortalListItem
          leadingIcon="log-out"
          title={t('auth.logout')}
          subtitle={t('portal.more.signOutSubtitle')}
          onPress={() => logout().finally(() => router.replace('/(auth)/login?mode=player'))}
          style={{ borderColor: colors.error, backgroundColor: `${colors.error}11` }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg },
  rtl: { direction: 'rtl' },
  infoCard: { gap: spacing.xs },
  section: { gap: spacing.sm },
  sectionHeader: { gap: 2 },
  list: { gap: spacing.sm },
  dangerWrap: { borderWidth: 1, borderRadius: 16, padding: spacing.sm, gap: spacing.xs },
});
