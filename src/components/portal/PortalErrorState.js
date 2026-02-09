import React from 'react';
import { PortalEmptyState } from './PortalEmptyState';
import { Button } from '../ui/Button';

export function PortalErrorState({ title, message, onRetry, retryLabel = 'Retry', onRelogin, reloginLabel = 'Re-login' }) {
  return (
    <PortalEmptyState
      icon="triangle-alert"
      title={title}
      description={message}
      action={
        <>
          {onRetry ? <Button variant="secondary" onPress={onRetry}>{retryLabel}</Button> : null}
          {onRelogin ? <Button onPress={onRelogin}>{reloginLabel}</Button> : null}
        </>
      }
    />
  );
}
