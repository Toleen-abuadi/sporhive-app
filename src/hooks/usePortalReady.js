import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../services/auth/auth.store';
import { validatePortalSession } from '../services/auth/portalSession';

const DEBUG_PORTAL_READY = true;

const logPortalReady = (event, payload = {}) => {
  if (!DEBUG_PORTAL_READY) return;
  console.info(`[usePortalReady] ${event}`, payload);
};

export function usePortalReady() {
  const { session, isLoading, isHydrating, ensurePortalReauthOnce } = useAuth();
  const [ensuring, setEnsuring] = useState(false);
  const [lastEnsureReason, setLastEnsureReason] = useState(null);
  const ensureInFlightRef = useRef(null);
  const lastAutoAttemptKeyRef = useRef(null);

  const validation = useMemo(
    () => validatePortalSession(session),
    [session]
  );

  const ensure = useCallback(
    async (options = {}) => {
      const source = options?.source || 'portal-screen';
      if (ensureInFlightRef.current) {
        logPortalReady('ensure:reused', { source });
        return ensureInFlightRef.current;
      }

      ensureInFlightRef.current = (async () => {
        if (isLoading || isHydrating) {
          const result = { ready: false, reason: 'auth_hydrating' };
          setLastEnsureReason(result.reason);
          logPortalReady('ensure:blocked', { source, reason: result.reason });
          return result;
        }

        const currentValidation = validatePortalSession(session);
        if (currentValidation.ok && !options?.force) {
          setLastEnsureReason(null);
          logPortalReady('ensure:alreadyReady', { source });
          return { ready: true, reason: null };
        }

        setEnsuring(true);
        const reauthResult = await ensurePortalReauthOnce?.({
          source: `usePortalReady:${source}`,
          reason: currentValidation.reason,
        });

        if (reauthResult?.success) {
          setLastEnsureReason(null);
          logPortalReady('ensure:success', { source });
          return { ready: true, reason: null };
        }

        const reason =
          reauthResult?.reason || currentValidation.reason || 'portal_session_invalid';
        setLastEnsureReason(reason);
        logPortalReady('ensure:failed', { source, reason });
        return { ready: false, reason };
      })().finally(() => {
        setEnsuring(false);
        ensureInFlightRef.current = null;
      });

      return ensureInFlightRef.current;
    },
    [ensurePortalReauthOnce, isHydrating, isLoading, session]
  );

  useEffect(() => {
    if (isLoading || isHydrating) return;
    if (validation.ok) {
      lastAutoAttemptKeyRef.current = null;
      setLastEnsureReason(null);
      return;
    }

    const attemptKey = [
      validation.reason,
      session?.login_as || session?.user?.type || 'none',
      session?.academyId || session?.user?.academy_id || 'none',
      session?.token ? 'token' : 'no-token',
    ].join(':');

    if (lastAutoAttemptKeyRef.current === attemptKey) return;
    lastAutoAttemptKeyRef.current = attemptKey;
    ensure({ source: 'auto_invalid_session' });
  }, [ensure, isHydrating, isLoading, session, validation.ok, validation.reason]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      ensure({ source: 'app_foreground', force: true });
    });

    return () => {
      subscription?.remove?.();
    };
  }, [ensure]);

  const ready = !isLoading && !isHydrating && validation.ok;
  const reason = ready
    ? null
    : isLoading || isHydrating
      ? 'auth_hydrating'
      : ensuring
        ? 'portal_ensuring'
        : lastEnsureReason || validation.reason || 'portal_not_ready';

  return { ready, reason, ensure };
}
