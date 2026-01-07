import React, { memo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PortalHeader, PortalSectionCard, PortalListRow, PortalEmptyState, PortalSkeleton } from '../../components/portal';
import { useTranslation } from '../../i18n';
import { colors, spacing, formatDate } from '../../theme/portal.styles';

const FeedbackScreen = memo(() => {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const isLoading = false; // Will be connected to hook

  const periods = [
    { id: 'current', label: t('portal.feedback.currentPeriod') },
    { id: 'previous', label: t('portal.feedback.previousPeriod') },
    { id: 'all', label: t('portal.feedback.allTime') },
  ];

  const renderPeriodSelector = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.id}
            onPress={() => setSelectedPeriod(period.id)}
            style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              marginRight: spacing.sm,
              backgroundColor: selectedPeriod === period.id ? colors.primary : colors.backgroundElevated,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: selectedPeriod === period.id ? colors.primary : colors.borderMedium,
            }}
          >
            <Text style={{
              color: selectedPeriod === period.id ? colors.textInverted : colors.textPrimary,
              fontWeight: selectedPeriod === period.id ? '600' : '400',
            }}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderFeedbackSummary = () => {
    if (isLoading) {
      return (
        <PortalSectionCard title={t('portal.feedback.summary')}>
          <PortalSkeleton height={120} style={{ borderRadius: 8 }} />
        </PortalSectionCard>
      );
    }

    return (
      <PortalSectionCard title={t('portal.feedback.summary')}>
        <PortalEmptyState
          icon="message-square"
          title={t('portal.feedback.noSummary')}
          subtitle={t('portal.feedback.noSummarySubtitle')}
        />
      </PortalSectionCard>
    );
  };

  const renderRecentFeedback = () => {
    if (isLoading) {
      return (
        <PortalSectionCard title={t('portal.feedback.recent')}>
          {[1, 2].map((i) => (
            <PortalSkeleton key={i} height={80} style={{ marginBottom: spacing.sm, borderRadius: 8 }} />
          ))}
        </PortalSectionCard>
      );
    }

    return (
      <PortalSectionCard title={t('portal.feedback.recent')}>
        <PortalEmptyState
          icon="clock"
          title={t('portal.feedback.noRecent')}
          subtitle={t('portal.feedback.noRecentSubtitle')}
          compact
        />
      </PortalSectionCard>
    );
  };

  const renderCategories = () => {
    return (
      <PortalSectionCard title={t('portal.feedback.categories')}>
        <PortalListRow
          icon="target"
          title={t('portal.feedback.technicalSkills')}
          subtitle={t('portal.feedback.viewTechnicalSkills')}
          showChevron
        />
        <PortalListRow
          icon="users"
          title={t('portal.feedback.teamwork')}
          subtitle={t('portal.feedback.viewTeamwork')}
          showChevron
        />
        <PortalListRow
          icon="award"
          title={t('portal.feedback.attitude')}
          subtitle={t('portal.feedback.viewAttitude')}
          showChevron
        />
      </PortalSectionCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <PortalHeader
        title={t('portal.feedback.title')}
        subtitle={t('portal.feedback.subtitle')}
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
        {renderPeriodSelector()}
        {renderFeedbackSummary()}
        {renderRecentFeedback()}
        {renderCategories()}
      </ScrollView>
    </SafeAreaView>
  );
});

FeedbackScreen.displayName = 'FeedbackScreen';

export default FeedbackScreen;