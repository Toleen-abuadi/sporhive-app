export const DEFAULT_MAP_CENTER = Object.freeze({
  lat: 31.9539,
  lng: 35.9106,
});

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeLatLng = (value) => {
  if (!value || typeof value !== 'object') return null;

  const lat = toFiniteNumber(value.lat ?? value.latitude);
  const lng = toFiniteNumber(value.lng ?? value.longitude ?? value.lon);

  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

export const averageCenter = (points, fallback = DEFAULT_MAP_CENTER) => {
  const list = Array.isArray(points) ? points.map(normalizeLatLng).filter(Boolean) : [];
  if (!list.length) return { ...fallback };

  const sum = list.reduce(
    (acc, point) => {
      acc.lat += point.lat;
      acc.lng += point.lng;
      return acc;
    },
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / list.length,
    lng: sum.lng / list.length,
  };
};

