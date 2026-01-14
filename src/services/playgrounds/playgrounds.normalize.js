const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const normalizeSliderItems = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return ensureArray(payload.items || payload.data || payload.slider || []);
};

export const normalizeVenueList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return ensureArray(payload.items || payload.data || payload.venues || []);
};

export const normalizeVenueDetails = (payload) => {
  if (!payload) return null;
  return payload.venue || payload.data || payload;
};

export const normalizeSlots = (payload) => {
  if (!payload) return [];
  return ensureArray(payload.slots || payload.data || payload.items || []);
};

export const normalizeBookings = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return ensureArray(payload.items || payload.data || payload.bookings || []);
};

export const normalizeBookingDetails = (payload) => {
  if (!payload) return null;
  return payload.booking || payload.data || payload;
};

export const normalizeRating = (payload) => {
  if (!payload) return null;
  return payload.rating || payload.data || payload;
};
