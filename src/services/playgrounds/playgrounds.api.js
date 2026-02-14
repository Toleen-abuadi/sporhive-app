import { endpoints } from '../api/endpoints';

const normalizeVenueList = (res) => {
  if (Array.isArray(res?.data?.venues)) return res.data.venues;
  if (Array.isArray(res?.venues)) return res.venues;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const normalizeBookingsList = (res) => {
  if (Array.isArray(res?.bookings)) return res.bookings;
  if (Array.isArray(res?.data?.bookings)) return res.data.bookings;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const normalizeActivitiesList = (res) => {
  if (Array.isArray(res?.activities)) return res.activities;
  if (Array.isArray(res?.data?.activities)) return res.data.activities;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const normalizeSlotsList = (res) => {
  if (Array.isArray(res?.slots)) return res.slots;
  if (Array.isArray(res?.data?.slots)) return res.data.slots;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const requireParam = (value, name) => {
  if (value === null || value === undefined || value === '') {
    throw new Error(`Missing ${name}`);
  }
};

// Defensive: allow passing expo-router param arrays or a venue object.
const resolveId = (value) => {
  if (Array.isArray(value)) return value[0];
  if (value && typeof value === 'object') return value.id;
  return value;
};

export const playgroundsApi = {
  async listVenues(params = {}) {
    const res = await endpoints.playgrounds.venuesList(params);
    return { raw: res, venues: normalizeVenueList(res) };
  },

  async getVenue(venueId, params = {}) {
    requireParam(venueId, 'venueId');
    const res = await endpoints.playgrounds.venuesList({ venue_id: venueId, id: venueId, ...params });
    const venues = normalizeVenueList(res);
    const match = venues.find((venue) => String(venue?.id) === String(venueId));
    return { raw: res, venue: match || null };
  },

  async getVenueDetails(venueId, params = {}) {
    return playgroundsApi.getVenue(venueId, params);
  },

  async getVenueDurations(venueId, params = {}) {
    const resolvedVenueId = resolveId(venueId);
    requireParam(resolvedVenueId, 'venueId');
    return endpoints.playgrounds.venueDurations({ venue_id: resolvedVenueId, ...params });
  },

  async getDurations({ venueId, activityId, academyProfileId } = {}) {
    const resolvedVenueId = resolveId(venueId);
    requireParam(resolvedVenueId, 'venueId');
    return endpoints.playgrounds.venueDurations({
      venue_id: resolvedVenueId,
      activity_id: activityId,
      academy_profile_id: academyProfileId,
    });
  },

  /**
   * Slots endpoint (per store + screen usage): prefers `duration_minutes`.
   * Keeps legacy `duration_id` only if minutes are not supplied.
   */
  async listAvailableSlots({ venueId, venue_id, date, duration_minutes, durationId, ...rest } = {}) {
    const resolvedVenueId = resolveId(venue_id || venueId);
    requireParam(resolvedVenueId, 'venueId');
    requireParam(date, 'date');

    const payload = {
      venue_id: resolvedVenueId,
      date,
      ...(duration_minutes != null ? { duration_minutes } : {}),
      ...(duration_minutes == null && durationId != null ? { duration_id: durationId } : {}),
      ...rest,
    };

    const res = await endpoints.playgrounds.slots(payload);
    return { raw: res, slots: normalizeSlotsList(res) };
  },

  /**
   * Local availability check: fetch slots then find by startTime.
   * Accepts either `duration_minutes` (preferred) OR `durationId` (legacy).
   */
  async verifySlotAvailability({ venueId, venue_id, date, duration_minutes, durationId, startTime, start_time, ...rest } = {}) {
    const resolvedVenueId = resolveId(venue_id || venueId);
    requireParam(resolvedVenueId, 'venueId');
    requireParam(date, 'date');

    const resolvedStartTime = startTime || start_time; // ✅ accept both
    requireParam(resolvedStartTime, 'startTime');

    if (duration_minutes == null && (durationId === null || durationId === undefined || durationId === '')) {
      throw new Error('Missing duration');
    }

    const res = await playgroundsApi.listAvailableSlots({
      venueId: resolvedVenueId,
      date,
      duration_minutes,
      durationId,
      ...rest,
    });

    const slots = res?.slots || [];
    const match = slots.find((slot) => String(slot?.start_time || slot?.start || '') === String(resolvedStartTime));

    return { available: Boolean(match), slot: match || null, slots };
  },

  async getSlots(payload = {}) {
    return playgroundsApi.listAvailableSlots(payload);
  },

  async createBooking(payload, config = {}) {
    return endpoints.playgrounds.createBooking(payload, config);
  },

  async listBookings(payload = {}, config = {}) {
    const res = await endpoints.playgrounds.listBookings(payload, config);
    return { raw: res, bookings: normalizeBookingsList(res) };
  },

  async listActivities(payload = {}) {
    const res = await endpoints.playgrounds.activitiesList(payload);
    return { raw: res, activities: normalizeActivitiesList(res) };
  },

  async resolveRatingToken(token) {
    if (!endpoints.playgrounds?.ratingResolveToken) {
      throw new Error('Playgrounds rating token resolver is unavailable.');
    }
    return endpoints.playgrounds.ratingResolveToken(token);
  },

  async rateBooking(payload) {
    if (!endpoints.playgrounds?.ratingCreate) {
      throw new Error('Playgrounds rating endpoint is unavailable.');
    }
    return endpoints.playgrounds.ratingCreate(payload);
  },

  async canRateBooking(payload) {
    if (!endpoints.playgrounds?.ratingCanRate) {
      throw new Error('Playgrounds rating eligibility endpoint is unavailable.');
    }
    return endpoints.playgrounds.ratingCanRate(payload);
  },
};
