// src/services/logrocket.js

import LogRocket from '@logrocket/react-native';
import Constants from 'expo-constants';

let initialized = false;

export const initLogRocket = () => {
  // Prevent double initialization
  if (initialized) return;

  const env = process.env.EXPO_PUBLIC_ENV_NAME || 'unknown';
  const isDev = __DEV__;

  // ❌ Do NOT initialize in development unless you want noise
  if (isDev) {
    console.log('[LogRocket] Skipped initialization in development mode');
    return;
  }

  try {
    LogRocket.init("d8e46091-2c57-4cbe-bdb9-a1a56df7e54d"); // 🔥 Replace with real ID

    // Optional: tag environment
    LogRocket.track('App Launched', { environment: env });

    // Optional: identify user later after login
    // LogRocket.identify(userId, {
    //   name: userName,
    //   email: userEmail,
    // });

    initialized = true;
    console.log('[LogRocket] Initialized successfully');
  } catch (error) {
    console.warn('[LogRocket] Initialization failed:', error);
  }
};
