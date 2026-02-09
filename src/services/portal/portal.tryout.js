// src/services/portal/portal.tryout.js
import { storage, PORTAL_KEYS } from '../storage/storage';

const normalizeTryOutId = (value) => {
  if (value == null) return null;

  // if object (try_out: {id: ...})
  if (typeof value === 'object') {
    const objId = value?.id ?? value?.try_out_id ?? value?.tryout_id ?? null;
    return normalizeTryOutId(objId);
  }

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

/**
 * Extract tryout id from overview response
 * Supports:
 * - registration_info.try_out (id OR object)
 * - registration_info.try_out_id / tryout_id
 * - subscription_history[0].log.old_value.try_out.id (your provided response)
 */
export const extractTryOutIdFromOverview = (data) => {
  if (!data) return null;

  const root = data?.player_data ? data : data?._raw ?? data;
  const playerData = root?.player_data || {};
  const registrationInfo = playerData?.registration_info || root?.registration || {};

  const rawTryOut =
    registrationInfo?.try_out ??
    registrationInfo?.try_out_id ??
    registrationInfo?.tryout_id ??
    playerData?.try_out_id ??
    root?.try_out_id ??
    playerData?.player_info?.id ??       
    root?.player_data?.player_info?.id ??
    null;

  // Fallback: subscription history old_value.try_out.id
  const subHist = Array.isArray(playerData?.subscription_history) ? playerData.subscription_history : [];
  const fallbackTryOut =
    subHist?.[0]?.log?.old_value?.try_out?.id ??
    subHist?.[0]?.log?.old_value?.try_out_id ??
    subHist?.[0]?.log?.old_value?.tryout_id ??
    null;

  const normalized = normalizeTryOutId(rawTryOut ?? fallbackTryOut);
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
  const raw =
    session?.tryOutId ??
    session?.try_out_id ??
    session?.tryout_id ??
    session?.player?.tryOutId ??
    session?.player?.try_out_id ??
    null;

  const normalized = normalizeTryOutId(raw);
  return isValidTryOutId(normalized) ? normalized : null;
};

/**
 * Persist tryOutId extracted from overview into PORTAL_KEYS.SESSION.
 * IMPORTANT: We do NOT fallback to player.id anymore.
 */
export const persistTryOutIdFromOverview = async (overview, academyId) => {
  const tryOutId = extractTryOutIdFromOverview(overview?._raw ?? overview);
  if (!isValidTryOutId(tryOutId)) return null;

  const existing = (await storage.getItem(PORTAL_KEYS.SESSION)) || {};
  const next = {
    ...existing,
    academyId: academyId ?? existing.academyId ?? null,
    tryOutId,
    try_out_id: tryOutId,
    tryout_id: tryOutId,
    player: overview?.player ? { ...(existing.player || {}), ...overview.player, tryOutId } : existing.player,
  };

  if (storage.setPortalSession) {
    await storage.setPortalSession(next);
  } else {
    await storage.setItem(PORTAL_KEYS.SESSION, next);
  }

  return tryOutId;
};
