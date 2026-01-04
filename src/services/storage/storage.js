import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  THEME: '@sporhive/theme',
  LANGUAGE: '@sporhive/language',
  AUTH_TOKEN: '@sporhive/auth_token',
  USER_DATA: '@sporhive/user_data',
};

class StorageService {
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

  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;

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

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  }

  async clear() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

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
    await this.removeItem(KEYS.AUTH_TOKEN);
    await this.removeItem(KEYS.USER_DATA);
  }
}

export const storage = new StorageService();
export { KEYS };
