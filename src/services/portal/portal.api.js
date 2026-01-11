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

const getPortalTokens = async () => {
  const raw = await storage.getItem(PORTAL_KEYS.AUTH_TOKENS);
  if (!raw) return null;
  if (typeof raw === 'object') return raw;

  // If someone stored it as string by mistake
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getPortalAccess = async () => {
  const tokens = await getPortalTokens();
  return tokens?.access || tokens?.token || null;
};

const getAcademyId = async (override) => {
  if (override != null) return Number(override);
  const stored = await storage.getItem(PORTAL_KEYS.ACADEMY_ID);
  return stored != null ? Number(stored) : null;
};

const portalAuthConfig = async (academyIdOverride) => {
  const access = await getPortalAccess();
  const academyId = await getAcademyId(academyIdOverride);

  if (!access) throw new Error('Portal access token missing');
  if (!academyId) throw new Error('Academy id missing');

  return {
    academyId,
    headers: {
      Authorization: `Bearer ${access}`,
      authorization: `Bearer ${access}`, // extra safety across platforms
      'X-Academy-Id': String(academyId),
    },
  };
};

export const portalApi = {
  /**
   * customer/active-list
   */
  async listAcademiesActive() {
    return wrapApi(async () => {
      // Some projects implement endpoints.customer.activeList(payload)
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
   * Returns {success:true, data:{...}} from apiClient interceptor
   */
  async login({ academyId, username, password }) {
    return wrapApi(async () => {
      const body = {
        academy_id: Number(academyId),
        username: String(username || '').trim(),
        password: String(password || ''),
      };

      // ✅ Do NOT use endpoints wrapper here (it often drops axios config)
      return apiClient.post('/player-portal-external-proxy/auth/login', body);
    }, 'Login failed');
  },

  /**
   * Proxy auth/me
   * Useful for "restore session" flows.
   */
  async me({ academyId } = {}) {
    return wrapApi(async () => {
      const { academyId: resolvedAcademyId, headers } = await portalAuthConfig(academyId);
      const body = { customer_id: resolvedAcademyId };

      // ✅ Force direct call with headers
      return apiClient.post('/player-portal-external-proxy/auth/me', body, { headers });
    }, 'Session verification failed');
  },

  /**
   * Password reset request (proxy -> academy)
   * This can be unauth, but we still attach academy id to route tenant.
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
   * ✅ Dashboard Overview (MUST include Authorization)
   * This is the one that was 403 because Authorization never arrived to backend.
   */
  async getOverview({ academyId } = {}) {
    return wrapApi(async () => {
      const { academyId: resolvedAcademyId, headers } = await portalAuthConfig(academyId);

      console.log('OVERVIEW AUTH HEADER =>', String(headers.Authorization || '').slice(0, 25));

      const body = { customer_id: resolvedAcademyId, academy_id: resolvedAcademyId };
      return apiClient.post('/player-portal-external-proxy/player-profile/overview', body, { headers });
    }, 'Failed to fetch dashboard data');
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
      return apiClient.post('/player-portal-external-proxy/registration/freezes/request', payload || {}, { headers });
    }, 'Freeze request failed');
  },

  async getRenewalsEligibility(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await portalAuthConfig();
      return apiClient.post('/player-portal-external-proxy/registration/renewals/eligibility', payload || {}, { headers });
    }, 'Failed to check renewal eligibility');
  },

  async requestRenewal(payload) {
    return wrapApi(async () => {
      const { headers } = await portalAuthConfig();
      return apiClient.post('/player-portal-external-proxy/registration/renewals/request', payload || {}, { headers });
    }, 'Renewal request failed');
  },

  async listUniformStore(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await portalAuthConfig();
      return apiClient.post('/player-portal-external-proxy/uniforms/store', payload || {}, { headers });
    }, 'Failed to fetch uniform store');
  },

  async createUniformOrder(payload) {
    return wrapApi(async () => {
      const { headers } = await portalAuthConfig();
      return apiClient.post('/player-portal-external-proxy/uniforms/order', payload || {}, { headers });
    }, 'Failed to create uniform order');
  },

  async listMyUniformOrders(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await portalAuthConfig();
      return apiClient.post('/player-portal-external-proxy/uniforms/my_orders', payload || {}, { headers });
    }, 'Failed to fetch uniform orders');
  },
};
