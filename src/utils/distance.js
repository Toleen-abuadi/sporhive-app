import { normalizeLatLng } from './map';

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export const distanceKm = (start, end) => {
  const a = normalizeLatLng(start);
  const b = normalizeLatLng(end);
  if (!a || !b) return null;

  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const formatDistanceLabel = (value, fractionDigits = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return '';
  if (numeric < 1) return `${Math.max(1, Math.round(numeric * 1000))} m away`;
  return `${numeric.toFixed(fractionDigits)} km away`;
};

