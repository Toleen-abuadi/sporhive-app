import React from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { Button } from '../../components/ui/Button';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

export function PortalResetPasswordScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader
        title={t('service.portal.reset.title')}
        subtitle={t('service.portal.reset.subtitle')}
      />
      <PortalEmptyState
        icon="key"
        title={t('service.portal.reset.comingSoonTitle')}
        description={t('service.portal.reset.comingSoonDescription')}
        action={
          <Button variant="secondary" onPress={() => router.back()}>
            {t('service.portal.reset.backToLogin')}
          </Button>
        }
      />
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
});
