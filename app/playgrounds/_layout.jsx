import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';

import { usePlaygroundsAuth } from '../../src/services/playgrounds/playgrounds.store';

export default function PlaygroundsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isInitialized } = usePlaygroundsAuth();

  useEffect(() => {
    if (!isInitialized) return;
    const [, route] = segments;
    const isIdentify = route === 'identify';
    const isRatingToken = route === 'r';

    if (!isAuthenticated && !isIdentify && !isRatingToken) {
      router.replace('/playgrounds/identify');
    }

    if (isAuthenticated && isIdentify) {
      router.replace('/playgrounds');
    }
  }, [isAuthenticated, isInitialized, router, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
