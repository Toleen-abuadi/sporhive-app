import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  THEME: '@sporhive/theme',
  LANGUAGE: '@sporhive/language',
  AUTH_TOKEN: '@sporhive/auth_token',
  USER_DATA: '@sporhive/user_data',
};

// ✅ NEW: Player Portal scoped keys (separate from main app auth)
export const PORTAL_KEYS = {
  ACADEMY_ID: '@sporhive/portal/academy_id',
  AUTH_TOKENS: '@sporhive/portal/auth_tokens', // { access, refresh, ... }
  SESSION: '@sporhive/portal/session', // { player, tryOutId, academyId }
};

class StorageService {
  // -------------------------
  // Low-level helpers
  // -------------------------
  async setItem(key, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Returns parsed JSON if value looks like JSON, otherwise returns string.
   * Returns null if key is missing.
   */
  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;

      // Try JSON parse
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Always returns raw string (or null).
   * Useful when you don't want auto JSON parsing.
   */
  async getString(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value === null ? null : value;
    } catch (error) {
      console.error(`Error getting string ${key}:`, error);
      return null;
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  }

  /**
   * Full clear (use carefully). Kept for admin/debug only.
   */
  async clear() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Remove a group of keys safely.
   */
  async removeMany(keys = []) {
    try {
      if (!Array.isArray(keys) || keys.length === 0) return true;
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Error removing many keys:', error);
      // Fallback: try individually
      try {
        await Promise.all(keys.map((k) => this.removeItem(k)));
      } catch {}
      return false;
    }
  }

  // -------------------------
  // Existing app preferences
  // -------------------------
  async getTheme() {
    return this.getItem(KEYS.THEME);
  }

  async setTheme(theme) {
    return this.setItem(KEYS.THEME, theme);
  }

  async getLanguage() {
    return this.getItem(KEYS.LANGUAGE);
  }

  async setLanguage(language) {
    return this.setItem(KEYS.LANGUAGE, language);
  }

  // -------------------------
  // Main app auth
  // -------------------------
  async getAuthToken() {
    return this.getItem(KEYS.AUTH_TOKEN);
  }

  async setAuthToken(token) {
    return this.setItem(KEYS.AUTH_TOKEN, token);
  }

  async getUserData() {
    return this.getItem(KEYS.USER_DATA);
  }

  async setUserData(userData) {
    return this.setItem(KEYS.USER_DATA, userData);
  }

  async logout() {
    await this.removeMany([KEYS.AUTH_TOKEN, KEYS.USER_DATA]);
  }

  // -------------------------
  // ✅ Player Portal storage
  // -------------------------
  async getPortalAcademyId() {
    const v = await this.getItem(PORTAL_KEYS.ACADEMY_ID);
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async setPortalAcademyId(id) {
    if (id === null || id === undefined || id === '') {
      return this.removeItem(PORTAL_KEYS.ACADEMY_ID);
    }
    return this.setItem(PORTAL_KEYS.ACADEMY_ID, String(Number(id)));
  }

  async getPortalTokens() {
    // tokens object {access, refresh...}
    const v = await this.getItem(PORTAL_KEYS.AUTH_TOKENS);
    return v && typeof v === 'object' ? v : null;
  }

  async setPortalTokens(tokens) {
    if (!tokens) return this.removeItem(PORTAL_KEYS.AUTH_TOKENS);
    return this.setItem(PORTAL_KEYS.AUTH_TOKENS, tokens);
  }

  async getPortalSession() {
    const v = await this.getItem(PORTAL_KEYS.SESSION);
    return v && typeof v === 'object' ? v : null;
  }

  async setPortalSession(session) {
    if (!session) return this.removeItem(PORTAL_KEYS.SESSION);
    return this.setItem(PORTAL_KEYS.SESSION, session);
  }

  /**
   * Logout portal ONLY (doesn't touch main app auth token)
   */
  async logoutPortal() {
    await this.removeMany([PORTAL_KEYS.AUTH_TOKENS, PORTAL_KEYS.SESSION]);
    // keep ACADEMY_ID (optional) so reset password works faster
    // if you want to clear it too, include PORTAL_KEYS.ACADEMY_ID
  }
}

export const storage = new StorageService();
