// app/portal/_layout.jsx
import React from 'react';
import { Stack } from 'expo-router';
import { PortalProvider } from '../../src/services/portal/portal.store';

export default function PortalLayout() {
  return (
    <PortalProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PortalProvider>
  );
}
