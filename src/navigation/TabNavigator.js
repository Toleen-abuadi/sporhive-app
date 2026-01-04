import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { HomeServicesScreen } from '../screens/HomeServicesScreen';
import { DiscoverStack } from './stacks/DiscoverStack';
import { BookingStack } from './stacks/BookingStack';
import { PortalStack } from './stacks/PortalStack';
import { ProfileStack } from './stacks/ProfileStack';

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Discover') {
            iconName = 'compass';
          } else if (route.name === 'Book') {
            iconName = 'calendar';
          } else if (route.name === 'Portal') {
            iconName = 'grid';
          } else if (route.name === 'Profile') {
            iconName = 'user';
          }

          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accentOrange,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeServicesScreen}
        options={{
          tabBarLabel: t('tabs.home'),
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverStack}
        options={{
          tabBarLabel: t('tabs.discover'),
        }}
      />
      <Tab.Screen
        name="Book"
        component={BookingStack}
        options={{
          tabBarLabel: t('tabs.book'),
        }}
      />
      <Tab.Screen
        name="Portal"
        component={PortalStack}
        options={{
          tabBarLabel: t('tabs.portal'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: t('tabs.profile'),
        }}
      />
    </Tab.Navigator>
  );
}
