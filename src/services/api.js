const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  '';

function normalizeError(error) {
  if (!error) return 'Something went wrong.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const anyErr = error || {};
    return anyErr.detail || anyErr.error || anyErr.message || 'Something went wrong.';
  }
  return 'Something went wrong.';
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function get(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    const data = await parseJson(res);
    if (!res.ok) {
      const message = data?.error || data?.detail || data?.message || 'Request failed.';
      return { ok: false, message };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: normalizeError(error) };
  }
}

export async function postJSON(path, body) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    if (!res.ok) {
      const message = data?.error || data?.detail || data?.message || 'Request failed.';
      return { ok: false, message };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: normalizeError(error) };
  }
}

export async function postMultipart(path, formData) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
    });
    const data = await parseJson(res);
    if (!res.ok) {
      const message = data?.error || data?.detail || data?.message || 'Request failed.';
      return { ok: false, message };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: normalizeError(error) };
  }
}
