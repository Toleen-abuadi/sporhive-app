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

  playgrounds: {
    getAll: (params) => apiClient.get('/playgrounds', { params }),
    getById: (id) => apiClient.get(`/playgrounds/${id}`),
    getAvailability: (id, date) =>
      apiClient.get(`/playgrounds/${id}/availability`, { params: { date } }),
  },

  bookings: {
    create: (bookingData) => apiClient.post('/bookings', bookingData),
    getAll: (params) => apiClient.get('/bookings', { params }),
    getById: (id) => apiClient.get(`/bookings/${id}`),
    cancel: (id) => apiClient.post(`/bookings/${id}/cancel`),
  },

  profile: {
    get: () => apiClient.get('/profile'),
    update: (data) => apiClient.put('/profile', data),
    uploadAvatar: (formData) =>
      apiClient.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  },
};
