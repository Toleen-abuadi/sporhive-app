import { apiClient } from '../api/client';

const normalizeAuthPayload = (data) => {
  if (!data || typeof data !== 'object') return data;
  if (data.token) return data;
  const token =
    data.access_token ||
    data.access ||
    data.tokens?.access ||
    data.tokens?.token ||
    null;
  if (!token) return data;
  return { ...data, token };
};

const wrapApi = async (fn, label = 'Auth API failed') => {
  try {
    const data = await fn();
    return { success: true, data: normalizeAuthPayload(data) };
  } catch (error) {
    if (__DEV__ || true) { // temporarily true for preview
      console.warn('[authApi] ' + label, {
        message: error?.message,
        kind: error?.kind,
        status: error?.status || error?.response?.status,
        url: error?.config?.url,
        baseURL: error?.config?.baseURL,
        data: error?.response?.data,
      });
    }
    return { success: false, error };
  }
};

export const authApi = {
  login(payload) {
    if (__DEV__ || true) {
      console.info('[authApi] login payload', {
        login_as: payload?.login_as,
        academy_id: payload?.academy_id,
        username: payload?.username,
        hasPassword: Boolean(payload?.player_password || payload?.password),
      });
    }
    return wrapApi(() => apiClient.post('/app-auth/login', payload), 'Login failed');
  },
  registerPublic(payload) {
    return wrapApi(() => apiClient.post('/public-users/register', payload), 'Registration failed');
  },
  passwordResetRequest(payload) {
    return wrapApi(
      () => apiClient.post('/app-auth/password-reset/request', payload),
      'Password reset request failed'
    );
  },
  passwordResetConfirm(payload) {
    return wrapApi(
      () => apiClient.post('/app-auth/password-reset/confirm', payload),
      'Password reset confirm failed'
    );
  },
  fetchAcademies() {
    return wrapApi(async () => {
      const res = await apiClient.post('/customer/active-list', {});
      const raw = res?.customers || res?.data?.customers || [];
      return raw.map((academy) => ({
        id: Number(academy?.id),
        name: academy?.academy_name || academy?.label || academy?.name || 'Academy',
        subtitle: academy?.client_name || academy?.city || academy?.location || '',
      }));
    }, 'Failed to fetch academies');
  },
  passwordResetVerify(payload) {
    return wrapApi(
      () => apiClient.post("/app-auth/password-reset/verify", payload),
      "OTP verification failed"
    );
  },
};


