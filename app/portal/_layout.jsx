import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { usePortalAuth } from '../../src/services/portal/portal.hooks';

export default function PortalLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isInitialized } = usePortalAuth();

  useEffect(() => {
    if (!isInitialized) return;
    const [, route] = segments;
    const isLogin = route === 'login';
    const isReset = route === 'reset-password';

    if (!isAuthenticated && !isLogin && !isReset) {
      router.replace('/portal/login');
    }

    if (isAuthenticated && isLogin) {
      router.replace('/portal/(tabs)/home');
    }
  }, [isAuthenticated, isInitialized, router, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
