// app/(portal)/_layout.js
import React from 'react';
import { Stack } from 'expo-router';

import { PortalProvider } from '../../src/services/portal/portal.store';
import { PortalModalsProvider } from '../../src/screens/portal/modals/PortalModalsProvider';
import { colors, typography } from '../../src/theme/portal.styles';

export default function PortalLayout() {
  return (
    <PortalProvider>
      <PortalModalsProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: colors.backgroundDark },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontFamily: typography.family.bold },
          }}
        />
      </PortalModalsProvider>
    </PortalProvider>
  );
}
