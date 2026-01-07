// src/navigation/stacks/PortalStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../../screens/portal/DashboardScreen';
import TrainingInfoScreen from '../../screens/portal/TrainingInfoScreen';
import PaymentsScreen from '../../screens/portal/PaymentsScreen';
import SubscriptionHistoryScreen from '../../screens/portal/SubscriptionHistoryScreen';
import UniformStoreScreen from '../../screens/portal/UniformStoreScreen';
import HealthFitnessScreen from '../../screens/portal/HealthFitnessScreen';
import PersonalInfoScreen from '../../screens/portal/PersonalInfoScreen';
import FeedbackScreen from '../../screens/portal/FeedbackScreen';

const Stack = createNativeStackNavigator();

export function PortalStack() {
  return (
    <Stack.Navigator
      initialRouteName="PortalDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="PortalDashboard" component={DashboardScreen} />
      <Stack.Screen name="PortalPersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="PortalTrainingInfo" component={TrainingInfoScreen} />
      <Stack.Screen name="PortalPayments" component={PaymentsScreen} />
      <Stack.Screen name="PortalSubscriptionHistory" component={SubscriptionHistoryScreen} />
      <Stack.Screen name="PortalUniformStore" component={UniformStoreScreen} />
      <Stack.Screen name="PortalHealthFitness" component={HealthFitnessScreen} />
      <Stack.Screen name="PortalFeedback" component={FeedbackScreen} />
    </Stack.Navigator>
  );
}
