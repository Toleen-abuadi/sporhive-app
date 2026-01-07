import React, { memo } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PortalHeader, PortalSectionCard, PortalListRow, PortalSkeleton } from '../../components/portal';
import { useTranslation } from '../../i18n';
import { colors, spacing } from '../../theme/portal.styles';

const PersonalInfoScreen = memo(() => {
  const { t } = useTranslation();
  const isLoading = false; // Will be connected to hook

  const renderPersonalDetails = () => {
    if (isLoading) {
      return (
        <PortalSectionCard title={t('portal.personal.details')}>
          <PortalSkeleton height={200} style={{ borderRadius: 8 }} />
        </PortalSectionCard>
      );
    }

    const details = [
      { label: t('portal.personal.fullName'), value: '--', icon: 'user' },
      { label: t('portal.personal.dateOfBirth'), value: '--', icon: 'calendar' },
      { label: t('portal.personal.phone'), value: '--', icon: 'phone' },
      { label: t('portal.personal.email'), value: '--', icon: 'mail' },
      { label: t('portal.personal.address'), value: '--', icon: 'home' },
    ];

    return (
      <PortalSectionCard 
        title={t('portal.personal.details')}
        actionLabel={t('portal.personal.edit')}
        onAction={() => {/* Navigate to edit modal */}}
      >
        {details.map((detail, index) => (
          <View key={index} style={{ paddingVertical: spacing.sm }}>
            <PortalListRow
              icon={detail.icon}
              title={detail.label}
              subtitle={detail.value}
              showChevron={false}
              compact
            />
          </View>
        ))}
      </PortalSectionCard>
    );
  };

  const renderEmergencyContact = () => {
    return (
      <PortalSectionCard 
        title={t('portal.personal.emergency')}
        actionLabel={t('portal.personal.edit')}
        onAction={() => {/* Navigate to edit modal */}}
      >
        <PortalListRow
          icon="phone-call"
          title={t('portal.personal.emergencyContact')}
          subtitle="--"
          showChevron={false}
        />
        <PortalListRow
          icon="phone"
          title={t('portal.personal.emergencyPhone')}
          subtitle="--"
          showChevron={false}
        />
      </PortalSectionCard>
    );
  };

  const renderMedicalInfo = () => {
    return (
      <PortalSectionCard 
        title={t('portal.personal.medicalInfo')}
        actionLabel={t('portal.personal.edit')}
        onAction={() => {/* Navigate to edit modal */}}
      >
        <PortalListRow
          icon="alert-triangle"
          title={t('portal.personal.allergies')}
          subtitle={t('portal.personal.noAllergies')}
          showChevron={false}
        />
        <PortalListRow
          icon="heart"
          title={t('portal.personal.conditions')}
          subtitle={t('portal.personal.noConditions')}
          showChevron={false}
        />
      </PortalSectionCard>
    );
  };

  const renderAccountSettings = () => {
    return (
      <PortalSectionCard title={t('portal.personal.account')}>
        <PortalListRow
          icon="lock"
          title={t('portal.personal.changePassword')}
          subtitle={t('portal.personal.changePasswordSubtitle')}
          showChevron
        />
        <PortalListRow
          icon="bell"
          title={t('portal.personal.notifications')}
          subtitle={t('portal.personal.notificationsSubtitle')}
          showChevron
        />
        <PortalListRow
          icon="globe"
          title={t('portal.personal.language')}
          subtitle={t('portal.personal.languageSubtitle')}
          showChevron
        />
      </PortalSectionCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <PortalHeader
        title={t('portal.personal.title')}
        subtitle={t('portal.personal.subtitle')}
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
        {renderPersonalDetails()}
        {renderEmergencyContact()}
        {renderMedicalInfo()}
        {renderAccountSettings()}
      </ScrollView>
    </SafeAreaView>
  );
});

PersonalInfoScreen.displayName = 'PersonalInfoScreen';

export default PersonalInfoScreen;