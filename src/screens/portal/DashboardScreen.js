import React, { memo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PortalHeader, PortalSectionCard, PortalStatPill, PortalListRow, PortalEmptyState, PortalSkeleton } from '../../components/portal';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { useTranslation } from '../../i18n';
import { colors, spacing } from '../../theme/portal.styles';

const DashboardScreen = memo(() => {
  const { t } = useTranslation();
  const { data, isLoading, isRefreshing, refresh } = usePortalOverview();

  const handleRefresh = React.useCallback(() => {
    refresh();
  }, [refresh]);

  const renderStats = () => {
    if (isLoading && !data) {
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
          label={t('portal.dashboard.sessions')}
          value={data?.upcomingSessions || 0}
          unit={t('portal.dashboard.sessionsUnit')}
          icon="calendar"
          style={{ marginRight: spacing.md, flex: 1 }}
        />
        <PortalStatPill
          label={t('portal.dashboard.payments')}
          value={data?.pendingPayments || 0}
          unit={t('portal.dashboard.paymentsUnit')}
          icon="credit-card"
          style={{ marginRight: spacing.md, flex: 1 }}
        />
        <PortalStatPill
          label={t('portal.dashboard.feedback')}
          value={data?.feedbackPending || 0}
          unit={t('portal.dashboard.feedbackUnit')}
          icon="message-square"
          style={{ flex: 1 }}
        />
      </View>
    );
  };

  const renderQuickActions = () => {
    const actions = [
      { id: 'uniforms', title: t('portal.dashboard.buyUniform'), icon: 'shopping-bag', route: '/portal/uniforms' },
      { id: 'freeze', title: t('portal.dashboard.requestFreeze'), icon: 'pause-circle', route: '/portal/modals/request-freeze' },
      { id: 'renewal', title: t('portal.dashboard.requestRenewal'), icon: 'refresh-cw', route: '/portal/modals/request-renewal' },
      { id: 'profile', title: t('portal.dashboard.editProfile'), icon: 'user', route: '/portal/modals/edit-profile' },
    ];

    return (
      <PortalSectionCard
        title={t('portal.dashboard.quickActions')}
        subtitle={t('portal.dashboard.quickActionsSubtitle')}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={{
                width: '48%',
                marginRight: '4%',
                marginBottom: spacing.md,
                backgroundColor: colors.backgroundElevated,
                borderRadius: 12,
                padding: spacing.md,
                alignItems: 'center',
              }}
              onPress={() => {/* Navigate to action.route */}}
            >
              <Text style={{ color: colors.primary, fontSize: 24, marginBottom: spacing.xs }}>
                {/* Icon would go here */}
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: 14, textAlign: 'center' }}>
                {action.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PortalSectionCard>
    );
  };

  const renderRecentActivity = () => {
    if (isLoading && !data) {
      return (
        <PortalSectionCard title={t('portal.dashboard.recentActivity')}>
          {[1, 2, 3].map((i) => (
            <PortalSkeleton key={i} height={60} style={{ marginBottom: spacing.sm, borderRadius: 8 }} />
          ))}
        </PortalSectionCard>
      );
    }

    if (!data?.recentActivity?.length) {
      return (
        <PortalSectionCard title={t('portal.dashboard.recentActivity')}>
          <PortalEmptyState
            icon="clock"
            title={t('portal.dashboard.noActivity')}
            subtitle={t('portal.dashboard.noActivitySubtitle')}
          />
        </PortalSectionCard>
      );
    }

    return (
      <PortalSectionCard title={t('portal.dashboard.recentActivity')}>
        {data.recentActivity.slice(0, 3).map((item, index) => (
          <PortalListRow
            key={item.id || index}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            rightText={item.date}
            showChevron={false}
            style={{ marginBottom: spacing.sm }}
          />
        ))}
      </PortalSectionCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <PortalHeader
        title={t('portal.dashboard.title')}
        subtitle={t('portal.dashboard.subtitle')}
        showNotifications={true}
        notificationCount={data?.notifications || 0}
      />
      
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.screenPadding }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {renderStats()}
        {renderQuickActions()}
        {renderRecentActivity()}
        
        <PortalSectionCard
          title={t('portal.dashboard.resources')}
          subtitle={t('portal.dashboard.resourcesSubtitle')}
        >
          <PortalListRow
            icon="book-open"
            title={t('portal.dashboard.trainingSchedule')}
            subtitle={t('portal.dashboard.viewTrainingSchedule')}
            onPress={() => {/* Navigate to training */}}
          />
          <PortalListRow
            icon="heart"
            title={t('portal.dashboard.healthTips')}
            subtitle={t('portal.dashboard.viewHealthTips')}
            onPress={() => {/* Navigate to health */}}
          />
          <PortalListRow
            icon="award"
            title={t('portal.dashboard.performance')}
            subtitle={t('portal.dashboard.viewPerformance')}
            onPress={() => {/* Navigate to feedback */}}
          />
        </PortalSectionCard>
      </ScrollView>
    </SafeAreaView>
  );
});

DashboardScreen.displayName = 'DashboardScreen';

export default DashboardScreen;