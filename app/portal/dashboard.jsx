import React from 'react';
import { Redirect } from 'expo-router';

export default function PortalDashboardRoute() {
  return <Redirect href="/portal/(tabs)/home" />;
}
