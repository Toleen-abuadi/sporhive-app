import axios from 'axios';
import { storage } from '../storage/storage';
import { handleApiError } from '../api/error';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL + '/api/v1/playgrounds';

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
  const lang = await storage.getLanguage();
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

export const playgroundsApi = {
  baseUrl: API_BASE_URL,

  async fetchSlider(params = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return playgroundsClient.get('/slider', { params, headers });
    }, 'Failed to fetch playgrounds slider');
  },

  async listVenues(params = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return playgroundsClient.get('/venues', { params, headers });
    }, 'Failed to fetch playgrounds venues');
  },

  async searchVenues(params = {}, options = {}) {
    return playgroundsApi.listVenues(params, options);
  },

  async fetchVenueDetails(venueId, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return playgroundsClient.get(`/venues/${encodeURIComponent(String(venueId))}`, { headers });
    }, 'Failed to fetch playground venue');
  },

  async fetchSlots(venueIdOrParams, params = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      const isObject = venueIdOrParams && typeof venueIdOrParams === 'object';
      const venueId = isObject
        ? venueIdOrParams.venue_id || venueIdOrParams.venueId || venueIdOrParams.id
        : venueIdOrParams;
      const mergedParams = isObject ? { ...venueIdOrParams } : { ...params };

      if (venueId != null) {
        delete mergedParams.venue_id;
        delete mergedParams.venueId;
        delete mergedParams.id;
      }

      const endpoint = venueId != null
        ? `/venues/${encodeURIComponent(String(venueId))}/slots`
        : '/slots';

      return playgroundsClient.get(endpoint, { params: mergedParams, headers });
    }, 'Failed to fetch playground slots');
  },

  async createBooking(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return playgroundsClient.post('/bookings', payload, { headers });
    }, 'Failed to create booking');
  },

  async listBookings(params = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return playgroundsClient.get('/bookings', { params, headers });
    }, 'Failed to fetch bookings');
  },

  async updateBooking(bookingIdOrPayload, payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      const isObject = bookingIdOrPayload && typeof bookingIdOrPayload === 'object';
      if (isObject) {
        return playgroundsClient.post('/bookings/update', bookingIdOrPayload, { headers });
      }
      return playgroundsClient.patch(`/bookings/${encodeURIComponent(String(bookingIdOrPayload))}`, payload, { headers });
    }, 'Failed to update booking');
  },

  async cancelBooking(bookingIdOrPayload, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      const isObject = bookingIdOrPayload && typeof bookingIdOrPayload === 'object';
      if (isObject) {
        return playgroundsClient.post('/bookings/cancel', bookingIdOrPayload, { headers });
      }
      return playgroundsClient.post(`/bookings/${encodeURIComponent(String(bookingIdOrPayload))}/cancel`, {}, { headers });
    }, 'Failed to cancel booking');
  },

  async uploadCliqReceipt(bookingId, formData, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders({ ...options, contentType: 'multipart/form-data' });
      return playgroundsClient.post(`/bookings/${encodeURIComponent(String(bookingId))}/cliq-upload`, formData, {
        headers,
      });
    }, 'Failed to upload CliQ receipt');
  },

  async identifyPublicUser(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return playgroundsClient.post('/identify', payload, { headers });
    }, 'Failed to identify public user');
  },

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
