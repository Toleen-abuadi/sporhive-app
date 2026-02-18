import React from 'react';
import { Tabs } from 'expo-router';

export default function PortalTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="renewals" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

