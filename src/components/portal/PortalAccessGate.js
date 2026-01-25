import React from 'react';
import { useRouter } from 'expo-router';

import { AppScreen } from '../ui/AppScreen';
import { AppHeader } from '../ui/AppHeader';
import { EmptyState } from '../ui/EmptyState';
import { useI18n } from '../../services/i18n/i18n';
import { useAuth } from '../../services/auth/auth.store';

export function PortalAccessGate({ children, titleOverride }) {
  const router = useRouter();
  const { t } = useI18n();
  const { userType, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (userType && userType !== 'player') {
    return (
      <AppScreen safe scroll={false}>
        <AppHeader title={titleOverride || t('portal.access.title')} />
        <EmptyState
          title={t('portal.access.title')}
          message={t('portal.access.description')}
          actionLabel={t('portal.access.action')}
          onAction={() => router.replace('/(app)/services')}
        />
      </AppScreen>
    );
  }

  return children;
}
