import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlaceholderScreen } from '../../screens/placeholders/PlaceholderScreen';

const Stack = createNativeStackNavigator();

export function PortalStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="PortalMain">
        {(props) => <PlaceholderScreen {...props} title="Portal" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
