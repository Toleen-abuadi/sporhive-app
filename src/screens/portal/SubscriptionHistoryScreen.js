import React, { memo } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PortalHeader, PortalSectionCard, PortalListRow, PortalEmptyState, PortalSkeleton } from '../../components/portal';
import { useTranslation } from '../../i18n';
import { colors, spacing, formatDate } from '../../theme/portal.styles';

const SubscriptionHistoryScreen = memo(() => {
  const { t } = useTranslation();
  const isLoading = false; // Will be connected to hook

  const renderCurrentSubscription = () => {
    if (isLoading) {
      return (
        <PortalSectionCard title={t('portal.history.current')}>
          <PortalSkeleton height={120} style={{ borderRadius: 8 }} />
        </PortalSectionCard>
      );
    }

    return (
      <PortalSectionCard title={t('portal.history.current')}>
        <PortalEmptyState
          icon="star"
          title={t('portal.history.noCurrent')}
          subtitle={t('portal.history.noCurrentSubtitle')}
          actionLabel={t('portal.history.browsePlans')}
          onAction={() => {/* Navigate to plans */}}
        />
      </PortalSectionCard>
    );
  };

  const renderHistory = () => {
    if (isLoading) {
      return (
        <PortalSectionCard title={t('portal.history.past')}>
          {[1, 2, 3].map((i) => (
            <PortalSkeleton key={i} height={80} style={{ marginBottom: spacing.sm, borderRadius: 8 }} />
          ))}
        </PortalSectionCard>
      );
    }

    return (
      <PortalSectionCard title={t('portal.history.past')}>
        <PortalEmptyState
          icon="clock"
          title={t('portal.history.noPast')}
          subtitle={t('portal.history.noPastSubtitle')}
        />
      </PortalSectionCard>
    );
  };

  const renderRenewals = () => {
    return (
      <PortalSectionCard title={t('portal.history.upcomingRenewals')}>
        <PortalListRow
          icon="refresh-cw"
          title={t('portal.history.autoRenewal')}
          subtitle={t('portal.history.autoRenewalSubtitle')}
          rightText={t('portal.history.enabled')}
          rightTextColor={colors.success}
        />
      </PortalSectionCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <PortalHeader
        title={t('portal.history.title')}
        subtitle={t('portal.history.subtitle')}
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
        {renderCurrentSubscription()}
        {renderHistory()}
        {renderRenewals()}
      </ScrollView>
    </SafeAreaView>
  );
});

SubscriptionHistoryScreen.displayName = 'SubscriptionHistoryScreen';

export default SubscriptionHistoryScreen;