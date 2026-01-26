import { handleApiError, ApiError } from './error';

export const normalizeApiError = (error) => {
  const resolved = error instanceof ApiError ? error : handleApiError(error);
  const status =
    resolved?.statusCode ??
    resolved?.status ??
    resolved?.meta?.status ??
    resolved?.response?.status ??
    null;
  const kind =
    error?.kind ||
    resolved?.kind ||
    (status === 401 || status === 403 ? 'AUTH' : resolved?.code || 'UNKNOWN_ERROR');
  const message = error?.message || resolved?.message || 'Something went wrong. Please try again.';

  return {
    kind,
    message,
    status,
    details: resolved?.meta || resolved,
  };
};
