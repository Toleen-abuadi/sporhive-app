// Portal Profile Screen: view player profile details.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useI18n } from '../../services/i18n/i18n';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { spacing } from '../../theme/tokens';

export function PortalProfileScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { profile, profileLoading, profileError } = usePlayerPortalStore((state) => ({
    profile: state.profile,
    profileLoading: state.profileLoading,
    profileError: state.profileError,
  }));
  const actions = usePlayerPortalActions();
  const placeholder = t('portal.common.placeholder');

  useEffect(() => {
    actions.fetchProfile();
  }, [actions]);

  if (profileLoading && !profile) {
    return (
      <AppScreen safe>
        <View style={styles.skeletonWrap}>
          <Skeleton height={120} radius={16} />
          <Skeleton height={220} radius={16} />
        </View>
      </AppScreen>
    );
  }

  if (profileError && !profile) {
    return (
      <AppScreen safe>
        <EmptyState
          title={t('portal.profile.errorTitle')}
          message={profileError?.message || t('portal.profile.errorDescription')}
          actionLabel={t('portal.common.retry')}
          onAction={actions.fetchProfile}
        />
      </AppScreen>
    );
  }

  const player = profile?.player || {};
  const registration = profile?.registration || {};

  return (
    <PortalAccessGate titleOverride={t('portal.profile.title')}>
      <AppScreen safe scroll>
        <AppHeader title={t('portal.profile.title')} subtitle={t('portal.profile.subtitle')} />

        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text variant="body" weight="bold" color={colors.textPrimary}>
            {t('portal.profile.sectionPlayer')}
          </Text>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.nameEn')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {`${player.firstEngName || ''} ${player.lastEngName || ''}`.trim() || placeholder}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.nameAr')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {`${player.firstArName || ''} ${player.lastArName || ''}`.trim() || placeholder}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.phone')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {player.phone || placeholder}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.phone2')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {player.phone2 || placeholder}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.email')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {player.email || placeholder}
            </Text>
          </View>
        </Card>

        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text variant="body" weight="bold" color={colors.textPrimary}>
            {t('portal.profile.sectionRegistration')}
          </Text>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.registrationType')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {registration.registrationType || placeholder}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.group')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {registration.groupName || placeholder}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.course')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {registration.courseName || placeholder}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.period')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {registration.startDate && registration.endDate
                ? `${registration.startDate} • ${registration.endDate}`
                : placeholder}
            </Text>
          </View>
        </Card>
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    gap: 4,
  },
  skeletonWrap: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
