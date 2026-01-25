const resolveAccessToken = (session) =>
  session?.tokens?.access ||
  session?.tokens?.token ||
  session?.token ||
  session?.access_token ||
  session?.access ||
  null;

export const getPlaygroundsAuthHeaders = (session) => {
  if (!session) return null;
  const accessToken = resolveAccessToken(session);
  if (!accessToken) return null;
  return { Authorization: `Bearer ${accessToken}` };
};

export const getPlaygroundsAccessToken = (session) => resolveAccessToken(session);
