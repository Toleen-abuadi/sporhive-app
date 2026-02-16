import React, { useCallback, useEffect, useRef } from 'react';
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

  // Prevent infinite loops: only trigger reauth once per error occurrence
  const handledReauthRef = useRef(false);
  const handleRetry = useCallback(() => {
    if (__DEV__) {
      console.trace('[TRACE] PortalAccessGate calling onRetry');
    }
    onRetry?.();
  }, [onRetry]);

  useEffect(() => {
    if (!error) {
      handledReauthRef.current = false;
      return;
    }
    if (!isPortalReauthError(error)) return;
    if (handledReauthRef.current) return;

    handledReauthRef.current = true;

    if (__DEV__) {
      console.trace('[TRACE] PortalAccessGate triggering onReauthRequired');
    }

    // IMPORTANT: side-effects must not run during render
    onReauthRequired?.(error);
  }, [error, onReauthRequired]);

  if (isLoading) {
    return null;
  }

  // Handle portal API errors (optional, only if a screen passes `error` in)
  if (error) {
    if (isPortalReauthError(error)) {
      // Rendering nothing while reauth flow is handled by the effect above.
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
            onAction={handleRetry}
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
