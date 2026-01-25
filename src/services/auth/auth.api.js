import { apiClient } from '../api/client';

const FALLBACK_ACADEMIES = [
  { id: 1, name: 'SporHive Academy', subtitle: 'Amman' },
  { id: 2, name: 'Elite FC', subtitle: 'Irbid' },
  { id: 3, name: 'North Star Hoops', subtitle: 'Zarqa' },
];

const wrapApi = async (fn, label = 'Auth API failed') => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (__DEV__) {
      console.warn(label, error);
    }
    return { success: false, error };
  }
};

export const authApi = {
  login(payload) {
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
      try {
        const res = await apiClient.post('/customer/active-list', {});
        const raw = res?.customers || res?.data?.customers || [];
        const academies = raw.map((academy) => ({
          id: Number(academy?.id),
          name: academy?.academy_name || academy?.label || academy?.name || 'Academy',
          subtitle: academy?.client_name || academy?.city || academy?.location || '',
        }));
        return academies.length ? academies : FALLBACK_ACADEMIES;
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to fetch academies, using fallback list.', error);
        }
        return FALLBACK_ACADEMIES;
      }
    }, 'Failed to fetch academies');
  },
  fallbackAcademies: FALLBACK_ACADEMIES,
};
