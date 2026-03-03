export function isAbsoluteUrl(value) {
  if (typeof value !== 'string') return false;
  const uri = value.trim();
  if (!uri) return false;
  return /^(https?:\/\/|file:\/\/|data:)/i.test(uri);
}

export function normalizeImageUrl(value, baseUrl = '') {
  if (typeof value !== 'string') return null;
  const uri = value.trim();
  if (!uri) return null;

  if (uri.startsWith('data:')) return uri;
  if (isAbsoluteUrl(uri)) return uri;

  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) return uri;

  if (uri.startsWith('/')) return `${base}${uri}`;
  return `${base}/${uri}`;
}

function toOrderNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

export function pickVenueImage(venue, baseUrl = '') {
  if (!venue || typeof venue !== 'object') return null;

  const direct = normalizeImageUrl(venue.image, baseUrl);
  if (direct) return direct;

  const images = Array.isArray(venue.images) ? venue.images : [];
  if (images.length) {
    const fromImages = images
      .slice()
      .sort((a, b) => toOrderNumber(a?.order) - toOrderNumber(b?.order))
      .map((image) => normalizeImageUrl(image?.url, baseUrl))
      .find(Boolean);
    if (fromImages) return fromImages;
  }

  return normalizeImageUrl(venue?.academy_profile?.hero_image, baseUrl);
}

