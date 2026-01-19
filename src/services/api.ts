type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  '';

function normalizeError(error: unknown): string {
  if (!error) return 'Something went wrong.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const anyErr = error as { message?: string; detail?: string; error?: string };
    return anyErr.detail || anyErr.error || anyErr.message || 'Something went wrong.';
  }
  return 'Something went wrong.';
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function get<T>(path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    const data = await parseJson(res);
    if (!res.ok) {
      const message = data?.error || data?.detail || data?.message || 'Request failed.';
      return { ok: false, message };
    }
    return { ok: true, data: data as T };
  } catch (error) {
    return { ok: false, message: normalizeError(error) };
  }
}

export async function postJSON<T>(path: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
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
    return { ok: true, data: data as T };
  } catch (error) {
    return { ok: false, message: normalizeError(error) };
  }
}

export async function postMultipart<T>(path: string, formData: FormData): Promise<ApiResult<T>> {
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
    return { ok: true, data: data as T };
  } catch (error) {
    return { ok: false, message: normalizeError(error) };
  }
}
