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
};
