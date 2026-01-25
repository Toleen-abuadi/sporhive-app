export const validatePlayerSession = (session) => {
  if (!session) {
    return { ok: false, reason: 'missing_session' };
  }

  const loginAs = session.login_as || session.user?.type || null;
  if (loginAs !== 'player') {
    return { ok: false, reason: 'not_player' };
  }

  const token =
    session.portal_tokens?.access ||
    session.portal_tokens?.access_token ||
    session.portalAccessToken ||
    null;
  if (!token) {
    return { ok: false, reason: 'missing_token' };
  }

  const academyId = session.user?.academy_id || session.user?.academyId || null;
  if (!academyId) {
    return { ok: false, reason: 'missing_academy_id' };
  }

  return { ok: true };
};

export const resolvePlayerPortalToken = (session) =>
  session?.portal_tokens?.access ||
  session?.portal_tokens?.access_token ||
  session?.portalAccessToken ||
  null;

export const resolvePlayerAcademyId = (session) =>
  session?.user?.academy_id || session?.user?.academyId || null;

export const resolvePlayerId = (session) =>
  session?.user?.external_player_id ||
  session?.user?.externalPlayerId ||
  session?.user?.player_id ||
  session?.user?.id ||
  null;
