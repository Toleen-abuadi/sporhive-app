import { API_BASE_URL } from '../config/env';

const buildUrl = (path) => {
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};

const normalizeError = async (response) => {
  const status = response.status;
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (payload && typeof payload === 'object') {
    const data = payload || {};
    const message = data.error || data.detail || data.message || response.statusText;
    return { message, status, details: payload };
  }

  return { message: response.statusText || 'Request failed', status };
};

export async function requestJson(path, body, options) {
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

  return response.json();
}

export async function requestFormData(path, formData) {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw await normalizeError(response);
  }

  return response.json();
}
