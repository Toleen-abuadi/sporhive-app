// src/services/portal/portal.api.js
import { apiClient } from '../api/client';

/**
 * NOTE:
 * - We assume your apiClient already injects Bearer token via storage interceptor.
 * - All endpoints below are proxy endpoints in your backend (as per your prompt).
 */
export const portalApi = {
  async getOverview() {
    // proxy of academy /player-profile/overview
    return apiClient.post('/player-profile/overview', {});
  },

  async printInvoice(payload) {
    // backend should return either:
    // - { url: "https://..." } OR
    // - { file_base64: "...", filename: "invoice.pdf" } OR
    // - raw bytes (unlikely via axios->json)
    return apiClient.post('/payments/print-invoice', payload);
  },

  async listUniformStore() {
    return apiClient.post('/uniforms/store', {});
  },

  async createUniformOrder(payload) {
    return apiClient.post('/uniforms/order', payload);
  },

  async listMyUniformOrders(payload = {}) {
    return apiClient.post('/uniforms/my_orders', payload);
  },

    updateProfile: async (payload) => {
    // proxy -> /player-profile/profile/update
    return apiClient.post('/player-profile/profile/update', payload);
  },

  // =========================
  // Freeze
  // =========================
  requestFreeze: async (payload) => {
    // proxy -> /registration/freezes/request
    return apiClient.post('/registration/freezes/request', payload);
  },

  // =========================
  // Renewals
  // =========================
  renewalsEligibility: async (payload) => {
    // proxy -> /registration/renewals/eligibility
    // If your backend path differs, keep the function and change only the URL.
    return apiClient.post('/registration/renewals/eligibility', payload);
  },
  renewalsRequest: async (payload) => {
    // proxy -> /registration/renewals/request
    return apiClient.post('/registration/renewals/request', payload);
  },

  // =========================
  // Feedback (Performance)
  // =========================
  feedbackTypes: async () => {
    // proxy -> /player-performance/feedback/types
    return apiClient.post('/player-performance/feedback/types', {});
  },
  feedbackPlayerSummary: async (payload) => {
    // proxy -> /feedback/player_summary
    return apiClient.post('/feedback/player_summary', payload);
  },
  feedbackPeriods: async (payload) => {
    // proxy -> /player-performance/feedback/periods
    return apiClient.post('/player-performance/feedback/periods', payload);
  },
};


