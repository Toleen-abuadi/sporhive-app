import React, { memo } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PortalHeader, PortalSectionCard, PortalStatPill, PortalEmptyState, PortalSkeleton } from '../../components/portal';
import { useTranslation } from '../../i18n';
import { colors, spacing } from '../../theme/portal.styles';

const HealthFitnessScreen = memo(() => {
  const { t } = useTranslation();
  const isLoading = false; // Will be connected to hook

  const renderHealthMetrics = () => {
    if (isLoading) {
      return (
        <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
          <PortalSkeleton width={100} height={80} style={{ marginRight: spacing.md, borderRadius: 12 }} />
          <PortalSkeleton width={100} height={80} style={{ marginRight: spacing.md, borderRadius: 12 }} />
          <PortalSkeleton width={100} height={80} style={{ borderRadius: 12 }} />
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
        <PortalStatPill
          label={t('portal.health.weight')}
          value="--"
          unit="kg"
          icon="activity"
          style={{ marginRight: spacing.md, flex: 1 }}
        />
        <PortalStatPill
          label={t('portal.health.height')}
          value="--"
          unit="cm"
          icon="maximize-2"
          style={{ marginRight: spacing.md, flex: 1 }}
        />
        <PortalStatPill
          label={t('portal.health.bmi')}
          value="--"
          unit=""
          icon="trending-up"
          style={{ flex: 1 }}
        />
      </View>
    );
  };

  const renderFitnessGoals = () => {
    return (
      <PortalSectionCard title={t('portal.health.goals')}>
        <PortalEmptyState
          icon="target"
          title={t('portal.health.noGoals')}
          subtitle={t('portal.health.noGoalsSubtitle')}
          actionLabel={t('portal.health.setGoals')}
          onAction={() => {/* Set goals */}}
        />
      </PortalSectionCard>
    );
  };

  const renderMedicalInfo = () => {
    return (
      <PortalSectionCard title={t('portal.health.medical')}>
        <View style={{ padding: spacing.md }}>
          <Text style={{ color: colors.textSecondary, lineHeight: 24 }}>
            {t('portal.health.medicalDescription')}
          </Text>
        </View>
      </PortalSectionCard>
    );
  };

  const renderTips = () => {
    return (
      <PortalSectionCard title={t('portal.health.tips')}>
        <View style={{ padding: spacing.md }}>
          <Text style={{ color: colors.textSecondary, lineHeight: 24 }}>
            {t('portal.health.tipsDescription')}
          </Text>
        </View>
      </PortalSectionCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <PortalHeader
        title={t('portal.health.title')}
        subtitle={t('portal.health.subtitle')}
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
        {renderHealthMetrics()}
        {renderFitnessGoals()}
        {renderMedicalInfo()}
        {renderTips()}
      </ScrollView>
    </SafeAreaView>
  );
});

HealthFitnessScreen.displayName = 'HealthFitnessScreen';

export default HealthFitnessScreen;