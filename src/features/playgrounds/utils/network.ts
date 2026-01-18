export type NetworkError = {
  message?: string;
  status?: number;
};

export const isNetworkError = (error: unknown) => {
  if (error instanceof TypeError) return true;
  if (error && typeof error === 'object' && 'status' in error) {
    const { status } = error as NetworkError;
    return status === undefined;
  }
  return false;
};

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong.') => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as NetworkError).message;
    if (message) return message;
  }
  return fallback;
};
