import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { storage, APP_STORAGE_KEYS, PORTAL_KEYS } from '../src/services/storage/storage';
import { STORAGE_KEYS } from '../src/services/storage/keys';
import { useTheme } from '../src/theme/ThemeProvider';

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const resolveRoute = async () => {
      const keys = [
        STORAGE_KEYS.PUBLIC_USER_MODE,
        STORAGE_KEYS.PUBLIC_USER,
        STORAGE_KEYS.PUBLIC_USER_TOKEN,
        APP_STORAGE_KEYS.AUTH_TOKEN,
        PORTAL_KEYS.SESSION,
        PORTAL_KEYS.AUTH_TOKENS,
      ];
      const entries = await storage.multiGet(keys);
      const data = Object.fromEntries(entries);

      const hasSession =
        Boolean(data[APP_STORAGE_KEYS.AUTH_TOKEN]) ||
        Boolean(data[STORAGE_KEYS.PUBLIC_USER_TOKEN]) ||
        Boolean(data[STORAGE_KEYS.PUBLIC_USER]?.id) ||
        Boolean(data[PORTAL_KEYS.SESSION]) ||
        Boolean(data[PORTAL_KEYS.AUTH_TOKENS]);

      if (hasSession) {
        router.replace('/services');
      } else {
        router.replace('/welcome');
      }
      setIsChecking(false);
    };

    resolveRoute();
  }, [router]);

  if (!isChecking) {
    return null;
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.accentOrange} />
    </View>
  );
}
