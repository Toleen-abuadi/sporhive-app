// app/index.js
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { storage, APP_STORAGE_KEYS } from '../src/services/storage/storage';
import { getPublicUserToken } from '../src/services/playgrounds/storage';
import { useTheme } from '../src/theme/ThemeProvider';

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const resolveRoute = async () => {
      const [welcomeSeenRaw, authToken, publicToken, session] = await Promise.all([
        storage.getItem(APP_STORAGE_KEYS.WELCOME_SEEN),
        storage.getAuthToken(),
        getPublicUserToken(),
        storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION),
      ]);
      const welcomeSeen = welcomeSeenRaw === true;
      const isLoggedIn = Boolean(authToken || publicToken || session?.userType);

      // Gate everything behind Welcome until Explore is pressed.
      router.replace(isLoggedIn || welcomeSeen ? '/services' : '/welcome');
      setIsChecking(false);
    };

    resolveRoute();
  }, [router]);

  if (!isChecking) return null;

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.accentOrange} />
    </View>
  );
}
