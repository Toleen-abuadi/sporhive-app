const normalizeReason = (value) => String(value || '').trim().toLowerCase();

export const isTokenExpiredReason = (reason) => {
  const normalized = normalizeReason(reason);
  return (
    normalized === 'expired' ||
    normalized === 'token_expired' ||
    normalized === 'tokenexpired' ||
    normalized === 'auth_token_expired' ||
    normalized === 'jwt_expired'
  );
};

export const isAuthTokenExpiredError = (error) => {
  if (!error) return false;
  const kind = error?.kind || error?.code || null;
  if (kind === 'AUTH_TOKEN_EXPIRED') return true;
  return isTokenExpiredReason(
    error?.reason || error?.reauthReason || error?.context?.reason || error?.context?.validationReason
  );
};

export const isPortalReauthError = (error) => {
  if (!error) return false;
  if (isAuthTokenExpiredError(error)) return false;

  const status =
    error?.status ||
    error?.response?.status ||
    error?.statusCode ||
    error?.meta?.status ||
    null;
  const kind = error?.kind || error?.code || null;
  return (
    kind === 'PORTAL_REAUTH_REQUIRED' ||
    kind === 'PORTAL_REAUTH_FAILED' ||
    kind === 'PORTAL_SESSION_INVALID' ||
    kind === 'PORTAL_ACADEMY_REQUIRED' ||
    status === 401
  );
};

export const isPortalForbiddenError = (error) => {
  if (!error) return false;
  const status =
    error?.status ||
    error?.response?.status ||
    error?.statusCode ||
    error?.meta?.status ||
    null;
  const kind = error?.kind || error?.code || null;
  return kind === 'PORTAL_FORBIDDEN' || status === 403;
};

