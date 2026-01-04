export class ApiError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const handleApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.message || data?.error || 'An error occurred';

    return new ApiError(message, data?.code || 'UNKNOWN_ERROR', status);
  }

  if (error.request) {
    return new ApiError(
      'Network error. Please check your connection.',
      'NETWORK_ERROR',
      0
    );
  }

  return new ApiError(
    error.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR',
    0
  );
};

export const isNetworkError = (error) => {
  return error instanceof ApiError && error.code === 'NETWORK_ERROR';
};

export const isAuthError = (error) => {
  return error instanceof ApiError && error.statusCode === 401;
};
