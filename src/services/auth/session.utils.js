import {
  getPortalAccessToken,
  getPortalAcademyId,
  getPortalPlayerId,
  validatePortalSession,
} from './portalSession';

export const validatePlayerSession = (session) => validatePortalSession(session);

export const resolvePlayerPortalToken = (session) => getPortalAccessToken(session);

export const resolvePlayerAcademyId = (session) => getPortalAcademyId(session);

export const resolvePlayerId = (session) => getPortalPlayerId(session);
