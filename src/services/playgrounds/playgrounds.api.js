// src/services/playgrounds/playgrounds.api.js
import axios from 'axios';
import { storage } from '../storage/storage';
import { handleApiError } from '../api/error';

// ✅ Defensive: avoid "undefined/api/v1/..." which causes silent network failures on device
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const API_BASE_URL = `${BASE}/api/v1/playgrounds`;

const playgroundsClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

playgroundsClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(handleApiError(error))
);

const resolveLanguage = async (override) => {
  if (override) return override;
  const lang = await storage.getLanguage?.();
  return lang || 'en';
};

const buildHeaders = async ({ language, contentType = 'application/json' } = {}) => {
  const resolvedLanguage = await resolveLanguage(language);
  return {
    Accept: 'application/json',
    'Accept-Language': resolvedLanguage,
    'Content-Type': contentType,
  };
};

const wrapApi = async (fn, label = 'Playgrounds API failed') => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    console.error(label, error);
    return { success: false, error };
  }
};

const enc = (v) => encodeURIComponent(String(v));

/**
 * ✅ Backend routes (from your ViewSet):
 * POST /public/academies-slider
 * POST /public/venues/list
 * POST /public/slots
 * POST /public/bookings/create
 * POST /public/bookings/list
 * POST /public/bookings/cancel/<booking_id>
 *
 * NOTE:
 * - Some older mobile endpoints were GET /slider, /venues, /slots, /bookings ... which do NOT exist.
 * - This file aligns mobile calls 1:1 with backend.
 */
export const playgroundsApi = {
  baseUrl: API_BASE_URL,

  // ------- PUBLIC BROWSE -------

  async fetchSlider(params = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      // ✅ correct backend endpoint
      return playgroundsClient.post('/public/academies-slider', params, { headers });
    }, 'Failed to fetch playgrounds slider');
  },

  async listVenues(params = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      // ✅ correct backend endpoint
      return playgroundsClient.post('/public/venues/list', params, { headers });
    }, 'Failed to fetch playgrounds venues');
  },

  async searchVenues(params = {}, options = {}) {
    return playgroundsApi.listVenues(params, options);
  },

  // If your backend has no "venue details" endpoint, keep this but expect 404.
  // (We didn't see it in the provided ViewSet list.)
  async fetchVenueDetails(venueId, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return playgroundsClient.get(`/venues/${enc(venueId)}`, { headers });
    }, 'Failed to fetch playground venue');
  },

  // ------- SLOTS -------

  /**
   * Supports both:
   * - fetchSlots({ venue_id, date, duration_minutes })
   * - fetchSlots(venueId, { date, duration_minutes })
   *
   * Backend expects POST /public/slots with:
   * { venue_id, date, duration_minutes }
   */
  async fetchSlots(venueIdOrParams, params = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);

      const isObject = venueIdOrParams && typeof venueIdOrParams === 'object';
      const venueId = isObject
        ? venueIdOrParams.venue_id || venueIdOrParams.venueId || venueIdOrParams.id
        : venueIdOrParams;

      const merged = isObject ? { ...venueIdOrParams } : { ...params };

      // normalize venue_id
      if (venueId != null) merged.venue_id = venueId;
      delete merged.venueId;
      delete merged.id;

      // ✅ correct backend endpoint
      return playgroundsClient.post('/public/slots', merged, { headers });
    }, 'Failed to fetch playground slots');
  },

  // ------- BOOKINGS -------

  /**
   * Backend expects POST /public/bookings/create with booking payload.
   */
  async createBooking(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      // ✅ correct backend endpoint
      return playgroundsClient.post('/public/bookings/create', payload, { headers });
    }, 'Failed to create booking');
  },

  /**
   * Backend expects POST /public/bookings/list with filter params:
   * likely includes { user_id } and optional filters.
   */
  async listBookings(params = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      // ✅ correct backend endpoint
      return playgroundsClient.post('/public/bookings/list', params, { headers });
    }, 'Failed to fetch bookings');
  },

  /**
   * If you don't have update in backend ViewSet, keep this but expect 404.
   * (Not shown in provided backend routes list.)
   */
  async updateBooking(bookingIdOrPayload, payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      const isObject = bookingIdOrPayload && typeof bookingIdOrPayload === 'object';
      if (isObject) {
        // legacy path (only works if backend supports it)
        return playgroundsClient.post('/bookings/update', bookingIdOrPayload, { headers });
      }
      return playgroundsClient.patch(`/bookings/${enc(bookingIdOrPayload)}`, payload, { headers });
    }, 'Failed to update booking');
  },

  /**
   * Backend expects POST /public/bookings/cancel/<booking_id>
   * payload commonly includes { user_id }.
   */
  async cancelBooking(bookingIdOrPayload, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);

      const isObject = bookingIdOrPayload && typeof bookingIdOrPayload === 'object';
      if (isObject) {
        const bookingId =
          bookingIdOrPayload.booking_id ||
          bookingIdOrPayload.bookingId ||
          bookingIdOrPayload.id;

        if (bookingId == null) {
          throw new Error('cancelBooking: bookingId is required (booking_id | bookingId | id)');
        }

        const body = { ...bookingIdOrPayload };
        delete body.bookingId;
        delete body.id;

        // ✅ correct backend endpoint
        return playgroundsClient.post(`/public/bookings/cancel/${enc(bookingId)}`, body, { headers });
      }

      // no payload (if backend allows)
      return playgroundsClient.post(`/public/bookings/cancel/${enc(bookingIdOrPayload)}`, {}, { headers });
    }, 'Failed to cancel booking');
  },

  /**
   * If your backend supports cliq upload for public bookings, keep; otherwise expect 404.
   */
  async uploadCliqReceipt(bookingId, formData, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders({ ...options, contentType: 'multipart/form-data' });
      return playgroundsClient.post(`/bookings/${enc(bookingId)}/cliq-upload`, formData, { headers });
    }, 'Failed to upload CliQ receipt');
  },

  // ------- LEGACY / IDENTIFY (only if backend exists) -------

  /**
   * Your backend ViewSet list did not show /identify. Keep only if it exists.
   * If not, this will 404. (Auth flow should use /api/v1/public-users/* instead.)
   */
  async identifyPublicUser(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return playgroundsClient.post('/identify', payload, { headers });
    }, 'Failed to identify public user');
  },

  // ------- RATINGS (only if backend exists) -------

  async resolveRatingToken(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      const body = typeof payload === 'string' ? { token: payload } : payload;
      return playgroundsClient.post('/ratings/resolve', body, { headers });
    }, 'Failed to resolve rating token');
  },

  async canRate(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return playgroundsClient.post('/ratings/can-rate', payload, { headers });
    }, 'Failed to check rating eligibility');
  },

  async createRating(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return playgroundsClient.post('/ratings', payload, { headers });
    }, 'Failed to submit rating');
  },
};
