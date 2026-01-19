export class ApiError extends Error {
  constructor(message, code, statusCode, meta = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.meta = meta;
  }
}

const getAxiosMeta = (error) => {
  const config = error?.config || {};
  return {
    status: error?.response?.status ?? null,
    data: error?.response?.data ?? null,
    url: config?.url ?? null,
    baseURL: config?.baseURL ?? null,
    method: config?.method ?? null,
    code: error?.code ?? null,
    message: error?.message ?? null,
  };
};

export const handleApiError = (error) => {
  const meta = getAxiosMeta(error);

  if (__DEV__) {
    console.warn('API error:', meta);
  }

  if (error?.response) {
    const { status, data } = error.response;
    const message = data?.message || data?.error || error?.message || 'An error occurred';

    return new ApiError(message, data?.code || error?.code || 'UNKNOWN_ERROR', status, meta);
  }

  if (error?.request) {
    return new ApiError(
      'Network error. Please check your connection.',
      error?.code || 'NETWORK_ERROR',
      0,
      meta
    );
  }

  return new ApiError(
    error?.message || 'An unexpected error occurred',
    error?.code || 'UNKNOWN_ERROR',
    0,
    meta
  );
};

export const isNetworkError = (error) => {
  return error instanceof ApiError && error.code === 'NETWORK_ERROR';
};

export const isAuthError = (error) => {
  return error instanceof ApiError && error.statusCode === 401;
};
