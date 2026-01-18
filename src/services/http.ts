import { EXPO_PUBLIC_API_BASE_URL } from '../config/env';

type NormalizedError = {
  message: string;
  status?: number;
  details?: unknown;
};

const buildUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  return `${EXPO_PUBLIC_API_BASE_URL}${path}`;
};

const normalizeError = async (response: Response): Promise<NormalizedError> => {
  const status = response.status;
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (payload && typeof payload === 'object') {
    const data = payload as { error?: string; detail?: string; message?: string };
    const message = data.error || data.detail || data.message || response.statusText;
    return { message, status, details: payload };
  }

  return { message: response.statusText || 'Request failed', status };
};

export async function requestJson<T>(
  path: string,
  body?: Record<string, unknown>,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: body ? 'POST' : 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  if (!response.ok) {
    throw await normalizeError(response);
  }

  return response.json() as Promise<T>;
}

export async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw await normalizeError(response);
  }

  return response.json() as Promise<T>;
}
