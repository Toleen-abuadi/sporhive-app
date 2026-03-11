import { sanitizeRedirectTo } from '../../utils/navigation/sanitizeRedirectTo';

export const PLAYGROUNDS_ROUTES = Object.freeze({
  services: '/(app)/services',
  map: '/playgrounds',
  explore: '/playgrounds/explore',
  bookings: '/playgrounds/bookings',
});

export const PLAYGROUNDS_ORIGINS = Object.freeze({
  explore: 'explore',
  map: 'map',
  bookings: 'bookings',
});

const ORIGIN_VALUES = new Set(Object.values(PLAYGROUNDS_ORIGINS));

export const normalizeRouteParam = (value) => {
  if (Array.isArray(value)) {
    return value.length ? String(value[0] || '').trim() : '';
  }
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export const normalizePlaygroundsOrigin = (value) => {
  const normalized = normalizeRouteParam(value).toLowerCase();
  return ORIGIN_VALUES.has(normalized) ? normalized : '';
};

const encodePathSegment = (value) => encodeURIComponent(String(value).trim());

const buildQuery = (params = {}) => {
  const entries = Object.entries(params).filter(([, raw]) => {
    if (raw === null || raw === undefined) return false;
    return String(raw).trim() !== '';
  });

  if (!entries.length) return '';

  return entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join('&');
};

export const withQuery = (path, params) => {
  const query = buildQuery(params);
  if (!query) return path;
  return `${path}?${query}`;
};

export const resolveSafeReturnTo = (value) => {
  const candidate = normalizeRouteParam(value);
  if (!candidate) return '';
  const safe = sanitizeRedirectTo(candidate);
  return typeof safe === 'string' ? safe : '';
};

export const resolveClusterRoute = (origin) => {
  const normalizedOrigin = normalizePlaygroundsOrigin(origin);
  if (normalizedOrigin === PLAYGROUNDS_ORIGINS.map) return PLAYGROUNDS_ROUTES.map;
  if (normalizedOrigin === PLAYGROUNDS_ORIGINS.bookings)
    return PLAYGROUNDS_ROUTES.bookings;
  return PLAYGROUNDS_ROUTES.explore;
};

export const buildVenueRoute = (venueId, { origin } = {}) => {
  const resolvedVenueId = normalizeRouteParam(venueId);
  if (!resolvedVenueId) return '';

  const normalizedOrigin = normalizePlaygroundsOrigin(origin);
  return withQuery(
    `/playgrounds/venue/${encodePathSegment(resolvedVenueId)}`,
    normalizedOrigin ? { from: normalizedOrigin } : {}
  );
};

export const buildBookingRoute = (venueId, { origin, returnTo } = {}) => {
  const resolvedVenueId = normalizeRouteParam(venueId);
  if (!resolvedVenueId) return '';

  const normalizedOrigin = normalizePlaygroundsOrigin(origin);
  const safeReturnTo = resolveSafeReturnTo(returnTo);

  return withQuery(
    `/playgrounds/book/${encodePathSegment(resolvedVenueId)}`,
    {
      ...(normalizedOrigin ? { from: normalizedOrigin } : {}),
      ...(safeReturnTo ? { returnTo: safeReturnTo } : {}),
    }
  );
};

export const resolveVenueFallbackRoute = ({ origin } = {}) =>
  resolveClusterRoute(origin);

export const resolveBookingFallbackRoute = ({
  venueId,
  origin,
  returnTo,
} = {}) => {
  const safeReturnTo = resolveSafeReturnTo(returnTo);
  if (safeReturnTo) return safeReturnTo;

  const normalizedOrigin = normalizePlaygroundsOrigin(origin);
  if (normalizedOrigin) return resolveClusterRoute(normalizedOrigin);

  const resolvedVenueId = normalizeRouteParam(venueId);
  if (resolvedVenueId) {
    return buildVenueRoute(resolvedVenueId, {
      origin: PLAYGROUNDS_ORIGINS.explore,
    });
  }

  return PLAYGROUNDS_ROUTES.explore;
};
