// app/portal/_layout.jsx
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PortalProvider, usePortalAuth } from '../../src/services/portal/portal.store';

function PortalGate() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isInitialized } = usePortalAuth();

  useEffect(() => {
    if (!isInitialized) return;
    const isLogin = segments.includes('login');
    if (!isAuthenticated && !isLogin) {
      router.replace('/portal/login');
      return;
    }
    if (isAuthenticated && isLogin) {
      router.replace('/portal/(tabs)/home');
    }
  }, [isAuthenticated, isInitialized, router, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function PortalLayout() {
  return (
    <PortalProvider>
      <PortalGate />
    </PortalProvider>
  );
}
