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
    requireParam(venueId, 'venueId');
    return endpoints.playgrounds.venueDurations({ venue_id: venueId, ...params });
  },
  async getDurations({ venueId, activityId, academyProfileId } = {}) {
    requireParam(venueId, 'venueId');
    return endpoints.playgrounds.venueDurations({
      venue_id: venueId,
      activity_id: activityId,
      academy_profile_id: academyProfileId,
    });
  },
  async listAvailableSlots({ venueId, date, durationId, ...rest } = {}) {
    requireParam(venueId, 'venueId');
    requireParam(date, 'date');
    const res = await endpoints.playgrounds.slots({
      venue_id: venueId,
      date,
      duration_id: durationId,
      ...rest,
    });
    return { raw: res, slots: normalizeSlotsList(res) };
  },
  async getSlots(payload = {}) {
    const res = await playgroundsApi.listAvailableSlots(payload);
    return res;
  },
  async createBooking(payload) {
    return endpoints.playgrounds.createBooking(payload);
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
