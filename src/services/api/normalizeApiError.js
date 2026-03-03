import { handleApiError, ApiError } from './error';

const inferScopeFromError = (error, resolved) => {
  const url = error?.config?.url || resolved?.meta?.url || resolved?.url || '';
  const value = String(url || '');
  if (value.includes('/player-portal-external-proxy/')) return 'portal';
  if (value.includes('/app-auth/')) return 'auth';
  return 'app';
};

const inferKind = ({ error, resolved, status, scope }) => {
  const explicit = error?.kind || error?.code || resolved?.kind || resolved?.code || null;
  if (explicit) return explicit;

  if (status === 0) return 'NETWORK_ERROR';
  if (status === 401) return scope === 'portal' ? 'PORTAL_REAUTH_REQUIRED' : 'REAUTH_REQUIRED';
  if (status === 403) return scope === 'portal' ? 'PORTAL_FORBIDDEN' : 'FORBIDDEN';
  if (status >= 500) return 'SERVER_ERROR';
  if (status >= 400) return 'HTTP_ERROR';
  return 'UNKNOWN_ERROR';
};

export const normalizeApiError = (error) => {
  const resolved = error instanceof ApiError ? error : handleApiError(error);
  const status =
    resolved?.statusCode ??
    resolved?.status ??
    resolved?.meta?.status ??
    resolved?.response?.status ??
    null;
  const scope = inferScopeFromError(error, resolved);
  const kind = inferKind({ error, resolved, status, scope });
  const message = error?.message || resolved?.message || 'Something went wrong. Please try again.';

  return {
    kind,
    message,
    status,
    scope,
    details: resolved?.meta || resolved,
  };
};
