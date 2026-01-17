// src/services/playgrounds/playgrounds.normalize.js
const ensureArray = (value) => (Array.isArray(value) ? value : []);

const normalizeVenue = (venue) => venue || null;

const normalizeAcademySlider = (academy) => academy || null;

const normalizeBooking = (booking) => booking || null;

const normalizeSlot = (slot) => slot || null;

export const normalizeSliderItems = (payload) => {
  if (!payload) return [];

  const list = Array.isArray(payload)
    ? payload
    : ensureArray(payload.academies || payload.items || payload.data || []);

  return list.map(normalizeAcademySlider).filter(Boolean);
};

export const normalizeVenueList = (payload) => {
  if (!payload) return [];

  const list = Array.isArray(payload)
    ? payload
    : ensureArray(payload.venues || payload.items || payload.data || []);

  return list.map(normalizeVenue).filter(Boolean);
};

export const normalizeVenueDetails = (payload) => {
  if (!payload) return null;

  const raw = payload.venue || payload.data || payload;
  return normalizeVenue(raw);
};

export const normalizeSlots = (payload) => {
  if (!payload) return [];

  const list = ensureArray(payload.slots || payload.data || payload.items || []);
  return list.map(normalizeSlot).filter(Boolean);
};

export const normalizeBookings = (payload) => {
  if (!payload) return [];

  const list = Array.isArray(payload)
    ? payload
    : ensureArray(payload.bookings || payload.items || payload.data || []);

  return list.map(normalizeBooking).filter(Boolean);
};

export const normalizeBookingDetails = (payload) => {
  if (!payload) return null;

  const raw = payload.booking || payload.data || payload;
  return normalizeBooking(raw);
};

export const normalizeRating = (payload) => {
  if (!payload) return null;
  return payload.rating || payload.data || payload;
};
