import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';

import { AppScreen } from '../ui/AppScreen';
import { AppHeader } from '../ui/AppHeader';
import { EmptyState } from '../ui/EmptyState';
import { useI18n } from '../../services/i18n/i18n';
import { useAuth } from '../../services/auth/auth.store';
import { LOGOUT_REASONS } from '../../services/auth/logoutReasons';
import {
  isPortalReauthError,
  isPortalForbiddenError,
} from '../../services/portal/portal.errors';
import { useSmartBack } from '../../navigation/useSmartBack';

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
  const { userType, isLoading, logout } = useAuth();
  const { goBack } = useSmartBack({ fallbackRoute: '/(app)/services' });
  const [reauthFailed, setReauthFailed] = useState(false);

  // Prevent infinite loops: only trigger reauth once per error occurrence
  const handledReauthRef = useRef(false);
  const handleRetry = useCallback(() => {
    if (__DEV__) {
      console.trace('[TRACE] PortalAccessGate calling onRetry');
    }
    onRetry?.();
  }, [onRetry]);

  useEffect(() => {
    let cancelled = false;
    if (!error) {
      handledReauthRef.current = false;
      setReauthFailed(false);
      return;
    }
    if (!isPortalReauthError(error)) return;
    if (handledReauthRef.current) return;

    handledReauthRef.current = true;

    if (__DEV__) {
      console.trace('[TRACE] PortalAccessGate triggering onReauthRequired', {
        kind: error?.kind || error?.code || null,
        status: error?.status || error?.response?.status || null,
        reason: error?.reason || null,
      });
    }

    // IMPORTANT: side-effects must not run during render
    (async () => {
      try {
        let recovered = false;
        if (typeof onReauthRequired === 'function') {
          const result = await onReauthRequired(error);
          recovered = result === true || result?.recovered === true || result?.ready === true;
        } else if (typeof onRetry === 'function') {
          const result = await onRetry();
          recovered = result?.success === true;
        }

        if (cancelled) return;
        setReauthFailed(!recovered);
        if (recovered) {
          handledReauthRef.current = false;
        }
      } catch {
        if (!cancelled) {
          setReauthFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [error, onReauthRequired, onRetry]);

  if (isLoading) {
    return null;
  }

  // Handle portal API errors (optional, only if a screen passes `error` in)
  if (error) {
    if (isPortalReauthError(error)) {
      if (!reauthFailed) {
        // Rendering nothing while reauth flow is handled by the effect above.
        return null;
      }
      return (
        <AppScreen safe scroll={false}>
          <AppHeader title={titleOverride || t('portal.access.title')} />
          <EmptyState
            title="Session expired"
            message="Session expired, please login."
            actionLabel={t('auth.login')}
            onAction={async () => {
              await logout({ reason: LOGOUT_REASONS.PORTAL_REAUTH_FAILED });
              router.replace('/(auth)/login?mode=player');
            }}
            secondaryActionLabel={t('common.back')}
            onSecondaryAction={onBack || goBack}
          />
        </AppScreen>
      );
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
            onSecondaryAction={onBack || goBack}
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
