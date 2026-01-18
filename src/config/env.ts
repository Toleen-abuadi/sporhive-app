const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export const EXPO_PUBLIC_API_BASE_URL = BASE_URL;
export const API_BASE = `${BASE_URL}/api/v1`;
export const PLAYGROUNDS_API = `${API_BASE}/playgrounds`;
