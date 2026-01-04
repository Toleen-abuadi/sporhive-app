import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlaceholderScreen } from '../../screens/placeholders/PlaceholderScreen';

const Stack = createNativeStackNavigator();

export function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ProfileMain">
        {(props) => <PlaceholderScreen {...props} title="Profile" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
