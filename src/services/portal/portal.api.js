import axios from 'axios';
import { handleApiError } from '../api/error';
import { storage } from '../storage/storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL + '/api/v1';

const portalClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

portalClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(handleApiError(error))
);

const wrapApi = async (fn, label = 'Portal API failed') => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    console.error(label, error);
    return { success: false, error };
  }
};

const getPortalToken = async () => {
  const tokens = await storage.getPortalTokens();
  if (!tokens) return null;
  return tokens.access || tokens.token || tokens.access_token || null;
};

const getPortalAcademyId = async () => storage.getPortalAcademyId();

const getPortalLanguage = async () => {
  const lang = await storage.getLanguage();
  return lang || 'en';
};

const buildPortalHeaders = async ({ academyId } = {}) => {
  const [token, storedAcademyId, language] = await Promise.all([
    getPortalToken(),
    getPortalAcademyId(),
    getPortalLanguage(),
  ]);

  const resolvedAcademyId = academyId ?? storedAcademyId;

  const headers = {
    'Accept-Language': language,
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (resolvedAcademyId) headers['X-Academy-Id'] = String(resolvedAcademyId);

  return { headers, academyId: resolvedAcademyId };
};

const portalEndpoints = {
  academies: '/customer/active-list',
  login: '/player-portal-external-proxy/auth/login',
  me: '/player-portal-external-proxy/auth/me',
  overview: '/player-portal-external-proxy/player-profile/overview',
  profileGet: '/player-portal-external-proxy/player-profile/profile/get',
  profileUpdate: '/player-portal-external-proxy/player-profile/profile/update',
  renewalsEligibility: '/player-portal-external-proxy/registration/renewals/eligibility',
  renewalsRequest: '/player-portal-external-proxy/registration/renewals/request',
  freezesList: '/player-portal-external-proxy/registration/freezes',
  freezesRequest: '/player-portal-external-proxy/registration/freezes/request',
  payments: '/player-portal-external-proxy/payments',
  invoice: '/player-portal-external-proxy/payments/invoice',
  ratingTypes: '/player-portal-external-proxy/ratings/types',
  ratingSummary: '/player-portal-external-proxy/ratings/summary',
  ratingPeriods: '/player-portal-external-proxy/ratings/periods',
  uniformStore: '/player-portal-external-proxy/uniforms/store',
  uniformOrder: '/player-portal-external-proxy/uniforms/order',
  uniformMyOrders: '/player-portal-external-proxy/uniforms/my_orders',
  newsList: '/player-portal-external-proxy/news/list',
};

export const portalApi = {
  async fetchActiveAcademies() {
    return wrapApi(async () => portalClient.post(portalEndpoints.academies, {}), 'Failed to fetch academies');
  },

  async listAcademiesActive() {
    return portalApi.fetchActiveAcademies();
  },

  async login({ academyId, username, password }) {
    return wrapApi(
      async () =>
        portalClient.post(portalEndpoints.login, {
          academy_id: Number(academyId),
          username: String(username || '').trim(),
          password: String(password || ''),
        }),
      'Login failed'
    );
  },

  async me({ academyId } = {}) {
    return wrapApi(async () => {
      const { headers, academyId: resolvedId } = await buildPortalHeaders({ academyId });
      return portalClient.post(portalEndpoints.me, { academy_id: resolvedId }, { headers });
    }, 'Session verification failed');
  },

  async authMe({ academyId } = {}) {
    return portalApi.me({ academyId });
  },

  async fetchOverview({ academyId } = {}) {
    return wrapApi(async () => {
      const { headers, academyId: resolvedId } = await buildPortalHeaders({ academyId });
      return portalClient.post(portalEndpoints.overview, { academy_id: resolvedId }, { headers });
    }, 'Failed to fetch overview');
  },

  async getProfile({ academyId } = {}) {
    return wrapApi(async () => {
      const { headers, academyId: resolvedId } = await buildPortalHeaders({ academyId });
      return portalClient.post(portalEndpoints.profileGet, { academy_id: resolvedId }, { headers });
    }, 'Failed to fetch profile');
  },

  async updateProfile(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.profileUpdate, payload, { headers });
    }, 'Profile update failed');
  },

  async renewalsEligibility(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.renewalsEligibility, payload, { headers });
    }, 'Failed to check renewal eligibility');
  },

  async renewalsRequest(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.renewalsRequest, payload, { headers });
    }, 'Renewal request failed');
  },

  async listFreezes(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.freezesList, payload, { headers });
    }, 'Failed to fetch freezes');
  },

  async requestFreeze(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.freezesRequest, payload, { headers });
    }, 'Freeze request failed');
  },

  async listPayments(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.payments, payload, { headers });
    }, 'Failed to fetch payments');
  },

  async fetchInvoice(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.invoice, payload, { headers });
    }, 'Failed to fetch invoice');
  },

  async listRatingTypes(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.ratingTypes, payload, { headers });
    }, 'Failed to fetch rating types');
  },

  async fetchRatingSummary(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.ratingSummary, payload, { headers });
    }, 'Failed to fetch rating summary');
  },

  async listRatingPeriods(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.ratingPeriods, payload, { headers });
    }, 'Failed to fetch rating periods');
  },

  async listUniformStore(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.uniformStore, payload, { headers });
    }, 'Failed to fetch uniform store');
  },

  async createUniformOrder(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.uniformOrder, payload, { headers });
    }, 'Failed to create uniform order');
  },

  async listMyUniformOrders(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.uniformMyOrders, payload, { headers });
    }, 'Failed to fetch uniform orders');
  },

  async listNews(payload = {}) {
    return wrapApi(async () => {
      const { headers } = await buildPortalHeaders({});
      return portalClient.post(portalEndpoints.newsList, payload, { headers });
    }, 'Failed to fetch news');
  },

  // Backwards compatibility aliases
  async feedbackTypes(payload = {}) {
    return portalApi.listRatingTypes(payload);
  },

  async feedbackPlayerSummary(payload = {}) {
    return portalApi.fetchRatingSummary(payload);
  },

  async feedbackPeriods(payload = {}) {
    return portalApi.listRatingPeriods(payload);
  },
};

export { API_BASE_URL as PORTAL_API_BASE_URL };
