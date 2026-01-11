// src/navigation/stacks/PortalTabNavigator.js
import React, { useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useI18n } from '../../services/i18n/i18n';
import { usePortal } from '../../services/portal/portal.store';
import { colors, spacing, typography, alphaBg } from '../../theme/portal.styles';
import DashboardScreen from '../../screens/portal/DashboardScreen';
import TrainingInfoScreen from '../../screens/portal/TrainingInfoScreen';
import HealthFitnessScreen from '../../screens/portal/HealthFitnessScreen';
import PaymentsScreen from '../../screens/portal/PaymentsScreen';
import SubscriptionHistoryScreen from '../../screens/portal/SubscriptionHistoryScreen';
import UniformStoreScreen from '../../screens/portal/UniformStoreScreen';
import FeedbackScreen from '../../screens/portal/FeedbackScreen';
import PersonalInfoScreen from '../../screens/portal/PersonalInfoScreen';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  {
    name: 'PortalDashboard',
    component: DashboardScreen,
    labelKey: 'portal.tabs.dashboard',
    icon: 'home',
  },
  {
    name: 'PortalTrainingInfo',
    component: TrainingInfoScreen,
    labelKey: 'portal.tabs.training',
    icon: 'calendar',
  },
  {
    name: 'PortalHealthFitness',
    component: HealthFitnessScreen,
    labelKey: 'portal.tabs.health',
    icon: 'heart',
  },
  {
    name: 'PortalPayments',
    component: PaymentsScreen,
    labelKey: 'portal.tabs.payments',
    icon: 'credit-card',
  },
  {
    name: 'PortalSubscriptionHistory',
    component: SubscriptionHistoryScreen,
    labelKey: 'portal.tabs.history',
    icon: 'clock',
  },
  {
    name: 'PortalUniformStore',
    component: UniformStoreScreen,
    labelKey: 'portal.tabs.store',
    icon: 'shopping-bag',
  },
  {
    name: 'PortalFeedback',
    component: FeedbackScreen,
    labelKey: 'portal.tabs.feedback',
    icon: 'star',
  },
  {
    name: 'PortalPersonalInfo',
    component: PersonalInfoScreen,
    labelKey: 'portal.tabs.personal',
    icon: 'user',
  },
];

// Custom Tab Bar Item Component
function TabBarItem({ route, focused, color, icon, label }) {
  return (
    <View style={styles.tabItem}>
      <View style={[
        styles.tabIconContainer,
        focused && styles.tabIconContainerActive,
      ]}>
        <Feather name={icon} size={20} color={focused ? colors.primary : color} />
      </View>
      <Text style={[
        styles.tabLabel,
        focused && styles.tabLabelActive,
      ]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function PortalTabNavigator() {
  const { t } = useI18n();
  const { logout, player } = usePortal();

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG.find(t => t.name === route.name);
        return {
          headerShown: false,
          tabBarIcon: ({ focused, color }) => {
            const icon = config?.icon || 'circle';
            return (
              <View style={styles.tabIconWrapper}>
                <Feather name={icon} size={20} color={focused ? colors.primary : color} />
              </View>
            );
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: {
            backgroundColor: alphaBg('#0B1220', 0.95),
            borderTopColor: colors.borderLight,
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 72,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: typography.family.medium,
            marginTop: 4,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
        };
      }}
    >
      {TAB_CONFIG.map((config) => (
        <Tab.Screen
          key={config.name}
          name={config.name}
          component={config.component}
          options={{
            tabBarLabel: t(config.labelKey, config.labelKey.split('.')[2]),
            tabBarButton: (props) => (
              <TabBarItem
                {...props}
                icon={config.icon}
                label={t(config.labelKey, config.labelKey.split('.')[2])}
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 60,
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabIconContainerActive: {
    backgroundColor: alphaBg(colors.primary, 0.12),
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: typography.family.medium,
    color: colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
