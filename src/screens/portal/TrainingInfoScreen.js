import React, { memo } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PortalHeader, PortalSectionCard, PortalEmptyState, PortalSkeleton } from '../../components/portal';
import { useTranslation } from '../../i18n';
import { colors, spacing } from '../../theme/portal.styles';

const TrainingInfoScreen = memo(() => {
  const { t } = useTranslation();
  const isLoading = false; // Will be connected to hook

  const renderSchedule = () => {
    if (isLoading) {
      return (
        <PortalSectionCard title={t('portal.training.schedule')}>
          {[1, 2, 3].map((i) => (
            <PortalSkeleton key={i} height={80} style={{ marginBottom: spacing.sm, borderRadius: 8 }} />
          ))}
        </PortalSectionCard>
      );
    }

    return (
      <PortalSectionCard title={t('portal.training.schedule')}>
        <PortalEmptyState
          icon="calendar"
          title={t('portal.training.noSchedule')}
          subtitle={t('portal.training.noScheduleSubtitle')}
        />
      </PortalSectionCard>
    );
  };

  const renderCoaches = () => {
    return (
      <PortalSectionCard title={t('portal.training.coaches')}>
        <PortalEmptyState
          icon="users"
          title={t('portal.training.noCoaches')}
          subtitle={t('portal.training.noCoachesSubtitle')}
        />
      </PortalSectionCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <PortalHeader
        title={t('portal.training.title')}
        subtitle={t('portal.training.subtitle')}
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
        {renderSchedule()}
        {renderCoaches()}
        
        <PortalSectionCard title={t('portal.training.facilities')}>
          <Text style={{ color: colors.textSecondary, lineHeight: 24 }}>
            {t('portal.training.facilitiesDescription')}
          </Text>
        </PortalSectionCard>
        
        <PortalSectionCard title={t('portal.training.equipment')}>
          <Text style={{ color: colors.textSecondary, lineHeight: 24 }}>
            {t('portal.training.equipmentDescription')}
          </Text>
        </PortalSectionCard>
      </ScrollView>
    </SafeAreaView>
  );
});

TrainingInfoScreen.displayName = 'TrainingInfoScreen';

export default TrainingInfoScreen;