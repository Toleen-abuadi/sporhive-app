export class ApiError extends Error {
  constructor(message, code, statusCode, meta = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.meta = meta;
  }
}

const getRequestMeta = (error) => {
  const config = error?.config || {};
  return {
    status: error?.response?.status ?? error?.status ?? error?.statusCode ?? null,
    data: error?.response?.data ?? error?.payload ?? null,
    url: config?.url ?? error?.url ?? null,
    baseURL: config?.baseURL ?? null,
    method: config?.method ?? null,
    code: error?.code ?? null,
    message: error?.message ?? null,
  };
};

export const handleApiError = (error) => {
  if (error instanceof ApiError) {
    return error;
  }

  const meta = getRequestMeta(error);

  if (__DEV__) {
    console.warn('API error:', meta);
  }

  if (error?.response || error?.status) {
    const status = error?.response?.status ?? error?.status ?? error?.statusCode ?? 0;
    const data = error?.response?.data ?? error?.payload ?? null;
    const message = data?.message || data?.error || error?.message || 'An error occurred';

    return new ApiError(message, data?.code || error?.code || 'UNKNOWN_ERROR', status, meta);
  }

  if (error?.request || error?.code === 'NETWORK_ERROR') {
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
