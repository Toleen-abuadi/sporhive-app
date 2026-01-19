import { apiClient } from './client';

export const endpoints = {
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    register: (userData) => apiClient.post('/auth/register', userData),
    logout: () => apiClient.post('/auth/logout'),
    refreshToken: (refreshToken) =>
      apiClient.post('/auth/refresh', { refreshToken }),
  },

  academies: {
    getAll: (params) => apiClient.get('/academies', { params }),
    getById: (id) => apiClient.get(`/academies/${id}`),
    search: (query) => apiClient.get('/academies/search', { params: { q: query } }),
  },

  /**
   * Public academy pages (mobile discovery + template page)
   * Backend convention in SporHive: POST endpoints under /public/*
   */
  publicAcademies: {
    list: (filters = {}) => apiClient.post('/public/academies/list', filters),
    templateGet: (slug) =>
      apiClient.post(`/public/academy-template/get/${encodeURIComponent(slug)}`, {}),

    getTemplate: (slug, body = {}) =>
      apiClient.post(`/public/academy-template/get/${encodeURIComponent(slug)}`, body),

    // ✅ map markers
    map: (filters = {}) => apiClient.post('/public/academies/map', filters),

    // ✅ join submit (adjust basename if your router differs)
    joinSubmit: (slug, payload) =>
      apiClient.post(`/public/academy-join/submit/${encodeURIComponent(slug)}`, payload),
  },

  bookings: {
    create: (bookingData) => apiClient.post('/bookings', bookingData),
    getAll: (params) => apiClient.get('/bookings', { params }),
    getById: (id) => apiClient.get(`/bookings/${id}`),
    cancel: (id) => apiClient.post(`/bookings/${id}/cancel`),
  },

  playgrounds: {
    venuesList: (payload = {}) => apiClient.post('/playgrounds/public/venues/list', payload),
    activitiesList: (payload = {}) => apiClient.post('/playgrounds/admin/activities/list', payload),
    venueDurations: (payload = {}) => apiClient.post('/playgrounds/admin/venues/durations/list', payload),
    slots: (payload = {}) => apiClient.post('/playgrounds/public/slots', payload),
    createBooking: (formData) =>
      apiClient.post('/playgrounds/public/bookings/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    listBookings: (payload = {}) => apiClient.post('/playgrounds/public/bookings/list', payload),
    ratingResolveToken: (token) => apiClient.post('/playgrounds/public/ratings/resolve-token', { token }),
    ratingCanRate: (payload = {}) => apiClient.post('/playgrounds/public/ratings/can-rate', payload),
    ratingCreate: (payload = {}) => apiClient.post('/playgrounds/public/ratings/create', payload),
  },

  publicUsers: {
    quickRegister: (payload) => apiClient.post('/public-users/quick-register', payload),
    login: (payload) => apiClient.post('/public-users/login', payload),
    register: (payload) => apiClient.post('/public-users/register', payload),
    passwordResetRequest: (payload) => apiClient.post('/public-users/password-reset/request', payload),
    passwordResetConfirm: (payload) => apiClient.post('/public-users/password-reset/confirm', payload),
  },

  profile: {
    get: () => apiClient.get('/profile'),
    update: (data) => apiClient.put('/profile', data),
    uploadAvatar: (formData) =>
      apiClient.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  },

  playerPortalProxy: {
    // -----------------------
    // Auth (AllowAny)
    // -----------------------
    login: (payload) =>
      apiClient.post('/player-portal-external-proxy/auth/login', payload),

    me: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/auth/me', payload),

    passwordResetRequest: (payload) =>
      apiClient.post('/player-portal-external-proxy/auth/password-reset/request', payload),

    // -----------------------
    // Uniforms
    // -----------------------
    uniformsStore: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/uniforms/store', payload),

    uniformsOrder: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/uniforms/order', payload),

    uniformsMyOrders: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/uniforms/my_orders', payload),

    // -----------------------
    // Registration
    // -----------------------
    freezesRequest: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/registration/freezes/request', payload),

    renewalsEligibility: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/registration/renewals/eligibility', payload),

    renewalsRequest: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/registration/renewals/request', payload),

    // -----------------------
    // Player Profile
    // -----------------------
    playerOverview: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/player-profile/overview', payload),

    playerProfileUpdate: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/player-profile/profile/update', payload),

    printInvoice: async (payload = {}) => {
      const res = await binaryClient.post(
        '/player-portal-external-proxy/registration/print_invoice',
        payload,
        { responseType: 'arraybuffer' }
      );
      return res.data; // ArrayBuffer
    },
    // -----------------------
    // Performance / Feedback
    // -----------------------
    feedbackTypes: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/player-performance/feedback/types', payload),

    feedbackPeriods: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/player-performance/feedback/periods', payload),

    feedbackPlayerSummary: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/player-performance/feedback/player_summary', payload),

    // -----------------------
    // News
    // -----------------------
    newsList: (payload = {}) =>
      apiClient.post('/player-portal-external-proxy/news/list', payload),
  },
};
