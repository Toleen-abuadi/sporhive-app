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
