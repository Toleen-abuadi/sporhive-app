import React, { memo } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PortalHeader, PortalSectionCard, PortalListRow, PortalEmptyState, PortalSkeleton } from '../../components/portal';
import { useTranslation } from '../../i18n';
import { colors, spacing, formatCurrency } from '../../theme/portal.styles';

const PaymentsScreen = memo(() => {
  const { t } = useTranslation();
  const isLoading = false; // Will be connected to hook

  const renderOutstanding = () => {
    if (isLoading) {
      return (
        <PortalSectionCard title={t('portal.payments.outstanding')}>
          <PortalSkeleton height={100} style={{ borderRadius: 8 }} />
        </PortalSectionCard>
      );
    }

    return (
      <PortalSectionCard title={t('portal.payments.outstanding')}>
        <View style={{ alignItems: 'center', padding: spacing.lg }}>
          <Text style={{ color: colors.primary, fontSize: 36, fontWeight: 'bold' }}>
            {formatCurrency(0)}
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
            {t('portal.payments.noOutstanding')}
          </Text>
        </View>
      </PortalSectionCard>
    );
  };

  const renderPaymentHistory = () => {
    if (isLoading) {
      return (
        <PortalSectionCard title={t('portal.payments.history')}>
          {[1, 2, 3].map((i) => (
            <PortalSkeleton key={i} height={60} style={{ marginBottom: spacing.sm, borderRadius: 8 }} />
          ))}
        </PortalSectionCard>
      );
    }

    return (
      <PortalSectionCard title={t('portal.payments.history')}>
        <PortalEmptyState
          icon="credit-card"
          title={t('portal.payments.noHistory')}
          subtitle={t('portal.payments.noHistorySubtitle')}
        />
      </PortalSectionCard>
    );
  };

  const renderPaymentMethods = () => {
    return (
      <PortalSectionCard title={t('portal.payments.methods')}>
        <PortalListRow
          icon="credit-card"
          title={t('portal.payments.creditCard')}
          subtitle={t('portal.payments.addCreditCard')}
          showChevron
        />
        <PortalListRow
          icon="smartphone"
          title={t('portal.payments.mobileWallet')}
          subtitle={t('portal.payments.addMobileWallet')}
          showChevron
        />
      </PortalSectionCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <PortalHeader
        title={t('portal.payments.title')}
        subtitle={t('portal.payments.subtitle')}
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
        {renderOutstanding()}
        {renderPaymentHistory()}
        {renderPaymentMethods()}
      </ScrollView>
    </SafeAreaView>
  );
});

PaymentsScreen.displayName = 'PaymentsScreen';

export default PaymentsScreen;