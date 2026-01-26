import { storage, PORTAL_KEYS } from '../storage/storage';

const normalizeTryOutId = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }
  return null;
};

export const isValidTryOutId = (value) => {
  const normalized = normalizeTryOutId(value);
  if (normalized == null) return false;
  if (typeof normalized === 'number') return normalized > 0;
  if (typeof normalized === 'string') {
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric > 0 : normalized.length > 0;
  }
  return false;
};

export const extractTryOutIdFromOverview = (data) => {
  if (!data) return null;
  const playerData = data?.player_data || {};
  const registrationInfo = playerData?.registration_info || data?.registration || {};

  const raw =
    registrationInfo?.try_out ??
    registrationInfo?.try_out_id ??
    registrationInfo?.tryout_id ??
    playerData?.try_out_id ??
    data?.try_out_id ??
    null;

  const normalized = normalizeTryOutId(raw);
  return isValidTryOutId(normalized) ? normalized : null;
};

export const assertTryOutId = (tryOutId) => {
  if (!isValidTryOutId(tryOutId)) {
    const error = new Error('Missing try_out (tryOutId is null). Please refresh portal session.');
    error.code = 'PORTAL_TRYOUT_MISSING';
    error.kind = 'PORTAL_TRYOUT_MISSING';
    throw error;
  }
  return true;
};

export const isMissingTryOutError = (error) => {
  return (
    error?.code === 'PORTAL_TRYOUT_MISSING' ||
    error?.kind === 'PORTAL_TRYOUT_MISSING' ||
    String(error?.message || '').includes('Missing try_out')
  );
};

export const getTryOutIdFromPortalSession = (session) => {
  if (!session) return null;
  const raw = session?.tryOutId ?? session?.try_out_id ?? session?.tryout_id ?? null;
  const normalized = normalizeTryOutId(raw);
  return isValidTryOutId(normalized) ? normalized : null;
};

export const persistTryOutIdFromOverview = async (overview, academyId) => {
  const tryOutId = extractTryOutIdFromOverview(overview?._raw ?? overview);
  if (!isValidTryOutId(tryOutId)) return null;

  const existing = (await storage.getItem(PORTAL_KEYS.SESSION)) || {};
  const next = {
    ...existing,
    academyId: academyId ?? existing.academyId ?? null,
    tryOutId,
    player: overview?.player ? { ...(existing.player || {}), ...overview.player } : existing.player,
  };

  if (storage.setPortalSession) {
    await storage.setPortalSession(next);
  } else {
    await storage.setItem(PORTAL_KEYS.SESSION, next);
  }

  return tryOutId;
};
