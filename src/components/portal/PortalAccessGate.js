import React from 'react';
import { useRouter } from 'expo-router';

import { AppScreen } from '../ui/AppScreen';
import { AppHeader } from '../ui/AppHeader';
import { EmptyState } from '../ui/EmptyState';
import { useI18n } from '../../services/i18n/i18n';
import { useAuth } from '../../services/auth/auth.store';
import {
  isPortalReauthError,
  isPortalForbiddenError,
} from '../../services/portal/portal.errors';

export function PortalAccessGate({
  children,
  titleOverride,
  error,
  onRetry,
  onBack,
  onReauthRequired,
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { userType, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  // Handle portal API errors (optional, only if a screen passes `error` in)
  if (error) {
    if (isPortalReauthError(error)) {
      // IMPORTANT: Gate itself does NOT force logout; keep it injectable for minimal diffs.
      // Screens can pass onReauthRequired={() => logout()} or navigate to login.
      onReauthRequired?.(error);
      return null;
    }

    if (isPortalForbiddenError(error)) {
      return (
        <AppScreen safe scroll={false}>
          <AppHeader title={titleOverride || t('portal.access.title')} />
          <EmptyState
            title={t('portal.forbidden.title')}
            message={t('portal.forbidden.description')}
            actionLabel={t('common.retry')}
            onAction={onRetry}
            secondaryActionLabel={t('common.back')}
            onSecondaryAction={onBack || (() => router.back())}
          />
        </AppScreen>
      );
    }
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
