export const isPortalReauthError = (error) => {
  if (!error) return false;
  const status =
    error?.status ||
    error?.response?.status ||
    error?.statusCode ||
    error?.meta?.status ||
    null;
  const kind = error?.kind || error?.code || null;
  return (
    kind === 'PORTAL_REAUTH_REQUIRED' ||
    kind === 'PORTAL_FORBIDDEN' ||
    status === 401 ||
    status === 403
  );
};
