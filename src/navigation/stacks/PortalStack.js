// src/navigation/stacks/PortalStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../../screens/portal/LoginScreen';
import ResetPasswordScreen from '../../screens/portal/ResetPasswordScreen';
import { PortalTabNavigator } from './PortalTabNavigator';
import EditProfileModal from '../../screens/portal/modals/EditProfileModal';
import RequestFreezeModal from '../../screens/portal/modals/RequestFreezeModal';
import RequestRenewalModal from '../../screens/portal/modals/RequestRenewalModal';

const Stack = createNativeStackNavigator();

export function PortalStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Auth Screens */}
      <Stack.Screen 
        name="PortalLogin" 
        component={LoginScreen} 
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name="ResetPassword" 
        component={ResetPasswordScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* Main Portal with Bottom Tabs */}
      <Stack.Screen 
        name="PortalMain" 
        component={PortalTabNavigator}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* Modals */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen 
          name="EditProfile" 
          component={EditProfileModal}
          options={{
            headerShown: true,
            title: 'Edit Profile',
            headerStyle: {
              backgroundColor: '#0B1220',
            },
            headerTintColor: '#EAF0FF',
          }}
        />
        <Stack.Screen 
          name="RequestFreeze" 
          component={RequestFreezeModal}
          options={{
            headerShown: true,
            title: 'Request Freeze',
            headerStyle: {
              backgroundColor: '#0B1220',
            },
            headerTintColor: '#EAF0FF',
          }}
        />
        <Stack.Screen 
          name="RequestRenewal" 
          component={RequestRenewalModal}
          options={{
            headerShown: true,
            title: 'Request Renewal',
            headerStyle: {
              backgroundColor: '#0B1220',
            },
            headerTintColor: '#EAF0FF',
          }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
