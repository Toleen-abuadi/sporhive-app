import React from 'react';
import { I18nManager } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from '../../../src/services/i18n/i18n';

export default function PortalTabsLayout() {
  const { isRTL } = useTranslation();
  const resolvedRTL = isRTL || I18nManager.isRTL;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        sceneStyle: { direction: resolvedRTL ? 'rtl' : 'ltr' },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="renewals" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
