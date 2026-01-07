import { endpoints } from '../api/endpoints';

export function withCustomer(customer_id, payload = {}) {
  return { customer_id, ...(payload || {}) };
}

export const playerPortal = {
  login: (academy_id, username, password) =>
    endpoints.playerPortalProxy.login({ academy_id, username, password }),

  me: (customer_id) =>
    endpoints.playerPortalProxy.me(withCustomer(customer_id)),

  overview: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.playerOverview(withCustomer(customer_id, payload)),

  updateProfile: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.playerProfileUpdate(withCustomer(customer_id, payload)),

  uniformsStore: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.uniformsStore(withCustomer(customer_id, payload)),

  myOrders: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.uniformsMyOrders(withCustomer(customer_id, payload)),

  orderUniform: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.uniformsOrder(withCustomer(customer_id, payload)),

  freezesRequest: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.freezesRequest(withCustomer(customer_id, payload)),

  renewalsEligibility: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.renewalsEligibility(withCustomer(customer_id, payload)),

  renewalsRequest: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.renewalsRequest(withCustomer(customer_id, payload)),

  feedbackTypes: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.feedbackTypes(withCustomer(customer_id, payload)),

  feedbackPeriods: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.feedbackPeriods(withCustomer(customer_id, payload)),

  feedbackSummary: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.feedbackPlayerSummary(withCustomer(customer_id, payload)),

  news: (customer_id, payload = {}) =>
    endpoints.playerPortalProxy.newsList(withCustomer(customer_id, payload)),
};
