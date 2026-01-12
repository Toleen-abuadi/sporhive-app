// src/services/portal/portal.api.js
import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import { storage, PORTAL_KEYS } from '../storage/storage';

/**
 * Always return a consistent shape:
 * { success: boolean, data?: any, error?: any }
 */
const wrapApi = async (fn, label = 'Portal API failed') => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    console.error(label, error);
    return { success: false, error };
  }
};

const parseMaybeJson = (payload) => {
  if (payload == null) return payload;
  if (typeof payload !== 'string') return payload;
  const trimmed = payload.trim();
  const isHtml = /^<!doctype html/i.test(trimmed) || /<html/i.test(trimmed) || /<body/i.test(trimmed);
  if (isHtml) {
    const snippet = trimmed.slice(0, 120);
    throw new Error(`Unexpected HTML response: ${snippet}`);
  }
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const snippet = trimmed.slice(0, 120);
    throw new Error(`Unable to parse response: ${snippet}`);
  }
};

const getPortalTokens = async () => {
  if (storage.getPortalTokens) return storage.getPortalTokens();
  const raw = await storage.getItem(PORTAL_KEYS.AUTH_TOKENS);
  if (!raw) return null;
  if (typeof raw === 'object') return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getPortalAccess = async () => {
  const tokens = await getPortalTokens();
  return tokens?.access || tokens?.token || tokens?.access_token || null;
};

const getAcademyId = async (override) => {
  if (override != null) return Number(override);
  if (storage.getPortalAcademyId) return storage.getPortalAcademyId();
  const stored = await storage.getItem(PORTAL_KEYS.ACADEMY_ID);
  return stored != null ? Number(stored) : null;
};

const portalAuthConfig = async (academyIdOverride) => {
  const access = await getPortalAccess();
  const academyId = await getAcademyId(academyIdOverride);

  const headers = {};
  if (access) {
    headers.Authorization = `Bearer ${access}`;
    headers.authorization = `Bearer ${access}`;
  }
  if (academyId) headers['X-Academy-Id'] = String(academyId);

  return {
    academyId,
    headers,
    withCredentials: true,
  };
};

const withAcademyPayload = async (payload = {}, academyIdOverride) => {
  const { academyId, headers } = await portalAuthConfig(academyIdOverride);
  const body = { ...(payload || {}) };
  if (academyId) {
    body.customer_id = academyId;
    body.academy_id = academyId;
  }

  return { body, headers };
};

export const portalApi = {
  /**
   * customer/active-list
   */
  async listAcademiesActive() {
    return wrapApi(async () => {
      if (endpoints?.customer?.activeList) {
        try {
          return await endpoints.customer.activeList({});
        } catch {
          // fallthrough
        }
      }
      return apiClient.post('/customer/active-list', {});
    }, 'Failed to fetch academies');
  },

  /**
   * Proxy login -> academy /api/v1/auth/login
   */
  async login({ academyId, username, password }) {
    return wrapApi(async () => {
      const body = {
        academy_id: Number(academyId),
        username: String(username || '').trim(),
        password: String(password || ''),
      };

      return apiClient.post('/player-portal-external-proxy/auth/login', body);
    }, 'Login failed');
  },

  /**
   * Proxy auth/me
   */
  async me({ academyId } = {}) {
    return wrapApi(async () => {
      const { academyId: resolvedAcademyId, headers } = await portalAuthConfig(academyId);
      const body = { customer_id: resolvedAcademyId };

      return apiClient.post('/player-portal-external-proxy/auth/me', body, { headers });
    }, 'Session verification failed');
  },

  /**
   * Password reset request (proxy -> academy)
   */
  async passwordResetRequest({ academyId, username, phoneNumber }) {
    return wrapApi(async () => {
      const id = await getAcademyId(academyId);
      if (!id) throw new Error('Academy id missing');

      const body = {
        customer_id: id,
        username: String(username || '').trim(),
        phone_number: String(phoneNumber || '').trim(),
      };

      return apiClient.post('/player-portal-external-proxy/auth/password-reset/request', body);
    }, 'Password reset request failed');
  },

  /**
   * Dashboard Overview
   * Supports cookie-based session or bearer token.
   */
  async fetchOverview({ academyId } = {}) {
    return wrapApi(async () => {
      const { academyId: resolvedAcademyId, headers, withCredentials } = await portalAuthConfig(academyId);
      const body = {};
      if (resolvedAcademyId) {
        body.customer_id = resolvedAcademyId;
        body.academy_id = resolvedAcademyId;
      }

      const res = await apiClient.post(
        '/player-portal-external-proxy/player-profile/overview',
        body,
        { headers, withCredentials }
      );

      return parseMaybeJson(res);
    }, 'Failed to fetch dashboard data');
  },

  async getOverview({ academyId } = {}) {
    return portalApi.fetchOverview({ academyId });
  },

  async updateProfile(payload) {
    return wrapApi(async () => {
      const { headers } = await portalAuthConfig();
      return apiClient.post('/player-portal-external-proxy/player-profile/profile/update', payload || {}, { headers });
    }, 'Profile update failed');
  },

  async requestFreeze(payload) {
    return wrapApi(async () => {
      const { headers } = await portalAuthConfig();
      return apiClient.post('/registration/freezes/request', payload || {}, { headers });
    }, 'Freeze request failed');
  },

  async getRenewalsEligibility(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await portalAuthConfig();
      return apiClient.post('/player-portal/registration/renewals/eligibility', payload || {}, { headers });
    }, 'Failed to check renewal eligibility');
  },

  async renewalsEligibility(payload = {}) {
    return portalApi.getRenewalsEligibility(payload);
  },

  async requestRenewal(payload) {
    return wrapApi(async () => {
      const { headers } = await portalAuthConfig();
      return apiClient.post('/player-portal/registration/renewals/request', payload || {}, { headers });
    }, 'Renewal request failed');
  },

  async renewalsRequest(payload) {
    return portalApi.requestRenewal(payload);
  },

  async listUniformStore(payload = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload);
      return apiClient.post('/player-portal-external-proxy/uniforms/store', body, { headers });
    }, 'Failed to fetch uniform store');
  },

  async createUniformOrder(payload) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload);
      return apiClient.post('/player-portal-external-proxy/uniforms/order', body, { headers });
    }, 'Failed to create uniform order');
  },

  async listMyUniformOrders(payload = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload);
      return apiClient.post('/player-portal-external-proxy/uniforms/my_orders', body, { headers });
    }, 'Failed to fetch uniform orders');
  },
};
