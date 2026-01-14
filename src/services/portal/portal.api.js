import { apiClient } from '../api/client';
import { storage, PORTAL_KEYS } from '../storage/storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL + '/api/v1';

const wrapApi = async (fn, label = 'Portal API failed') => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    console.error(label, error);
    return { success: false, error };
  }
};

const readPortalTokens = async () => {
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

const resolveToken = async (override) => {
  if (override) return override;
  const tokens = await readPortalTokens();
  return tokens?.access || tokens?.token || tokens?.access_token || null;
};

const resolveAcademyId = async (override) => {
  if (override != null) return Number(override);
  if (storage.getPortalAcademyId) return storage.getPortalAcademyId();
  const stored = await storage.getItem(PORTAL_KEYS.ACADEMY_ID);
  return stored != null ? Number(stored) : null;
};

const resolveLanguage = async (override) => {
  if (override) return override;
  const lang = await storage.getLanguage();
  return lang || 'en';
};

const resolveTryOutId = async (override) => {
  if (override != null) return Number(override);

  if (storage.getPortalSession) {
    const session = await storage.getPortalSession();
    const id = session?.tryOutId ?? session?.try_out_id ?? null;
    return id != null ? Number(id) : null;
  }

  const session = await storage.getItem(PORTAL_KEYS.SESSION);
  const id = session?.tryOutId ?? session?.try_out_id ?? null;
  return id != null ? Number(id) : null;
};


const buildHeaders = async ({ academyId, token, language, tryOutId } = {}) => {
  const resolvedToken = await resolveToken(token);
  const resolvedAcademyId = await resolveAcademyId(academyId);
  const resolvedLanguage = await resolveLanguage(language);
  const resolvedTryOutId = await resolveTryOutId(tryOutId);

  const headers = { 'Accept-Language': resolvedLanguage };

  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`;
    headers.authorization = `Bearer ${resolvedToken}`;
  }

  if (resolvedAcademyId) {
    headers['X-Academy-Id'] = String(resolvedAcademyId);
  }

  return { headers, academyId: resolvedAcademyId, tryOutId: resolvedTryOutId };
};


const withAcademyPayload = async (payload = {}, options = {}) => {
  const { headers, academyId, tryOutId } = await buildHeaders(options);
  const body = { ...(payload || {}) };

  if (academyId) {
    body.customer_id = academyId;
    body.academy_id = academyId;
  }

  if (tryOutId != null && body.try_out == null) {
    body.try_out = tryOutId;
  }

  if (tryOutId != null && body.tryout_id == null && body.try_out_id == null) {
    body.tryout_id = tryOutId;
  }

  return { body, headers };
};


export const portalApi = {
  baseUrl: API_BASE_URL,

  async fetchActiveAcademies() {
    return wrapApi(() => apiClient.post('/customer/active-list', {}), 'Failed to fetch academies');
  },

  async listAcademiesActive() {
    return portalApi.fetchActiveAcademies();
  },

  async login({ academyId, username, password }) {
    return wrapApi(() => {
      const body = {
        academy_id: Number(academyId),
        username: String(username || '').trim(),
        password: String(password || ''),
      };

      return apiClient.post('/player-portal-external-proxy/auth/login', body);
    }, 'Login failed');
  },

  async authMe({ academyId } = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload({}, { academyId });
      return apiClient.post('/player-portal-external-proxy/auth/me', body, { headers });
    }, 'Session verification failed');
  },

  async me({ academyId } = {}) {
    return portalApi.authMe({ academyId });
  },

  async getOverview({ academyId } = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload({}, { academyId });
      return apiClient.post('/player-portal-external-proxy/player-profile/overview', body, { headers });
    }, 'Failed to fetch overview');
  },

  async updateProfile(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/player-profile/profile/update', body, { headers });
    }, 'Profile update failed');
  },

  async renewalsEligibility(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/registration/renewals/eligibility', body, { headers });
    }, 'Failed to check renewal eligibility');
  },

  async checkRenewalEligibility(payload = {}, options = {}) {
    return portalApi.renewalsEligibility(payload, options);
  },

  async renewalsRequest(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/registration/renewals/request', body, { headers });
    }, 'Renewal request failed');
  },

  async submitRenewal(payload = {}, options = {}) {
    return portalApi.renewalsRequest(payload, options);
  },

  async requestFreeze(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/registration/freezes/request', body, { headers });
    }, 'Freeze request failed');
  },

  async submitFreeze(payload = {}, options = {}) {
    return portalApi.requestFreeze(payload, options);
  },

  async printInvoice(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/registration/print_invoice', body, {
        headers,
        responseType: 'arraybuffer',
      });
    }, 'Invoice download failed');
  },

  async getRatingTypes(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/player-performance/feedback/types', body, { headers });
    }, 'Failed to load rating types');
  },

  async fetchRatingTypes(payload = {}, options = {}) {
    return portalApi.getRatingTypes(payload, options);
  },

  async getRatingSummary(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/player-performance/feedback/player_summary', body, { headers });
    }, 'Failed to load rating summary');
  },

  async fetchPerformanceSummary(payload = {}, options = {}) {
    return portalApi.getRatingSummary(payload, options);
  },

  async getRatingPeriods(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/player-performance/feedback/periods', body, { headers });
    }, 'Failed to load rating periods');
  },

  async fetchPerformancePeriods(payload = {}, options = {}) {
    return portalApi.getRatingPeriods(payload, options);
  },

  async listUniformStore(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/uniforms/store', body, { headers });
    }, 'Failed to fetch uniform store');
  },

  async fetchUniformStore(payload = {}, options = {}) {
    return portalApi.listUniformStore(payload, options);
  },

  async createUniformOrder(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/uniforms/order', body, { headers });
    }, 'Failed to create uniform order');
  },

  async placeUniformOrder(payload = {}, options = {}) {
    return portalApi.createUniformOrder(payload, options);
  },

  async listMyUniformOrders(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/uniforms/my_orders', body, { headers });
    }, 'Failed to fetch uniform orders');
  },

  async fetchMyUniformOrders(payload = {}, options = {}) {
    return portalApi.listMyUniformOrders(payload, options);
  },

  async listNews(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/news/list', body, { headers });
    }, 'Failed to fetch news');
  },

  async fetchNews(payload = {}, options = {}) {
    return portalApi.listNews(payload, options);
  },
};
