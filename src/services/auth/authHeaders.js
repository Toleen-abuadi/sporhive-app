const resolveAccessToken = (session) => session?.token || null;

export const getPlaygroundsAuthHeaders = (session) => {
  if (!session) return null;
  const accessToken = resolveAccessToken(session);
  if (!accessToken) return null;
  return { Authorization: `Bearer ${accessToken}` };
};

export const getPlaygroundsAccessToken = (session) => resolveAccessToken(session);
