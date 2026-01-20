// app/index.js
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { storage, APP_STORAGE_KEYS } from '../src/services/storage/storage';
import { useTheme } from '../src/theme/ThemeProvider';

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const resolveRoute = async () => {
      const welcomeSeenRaw = await storage.getItem(APP_STORAGE_KEYS.WELCOME_SEEN);
      const welcomeSeen = welcomeSeenRaw === false;

      // Gate everything behind Welcome until Explore is pressed.
      router.replace(welcomeSeen ? '/services' : '/welcome');
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
