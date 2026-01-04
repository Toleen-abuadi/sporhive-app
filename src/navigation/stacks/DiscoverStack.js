import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlaceholderScreen } from '../../screens/placeholders/PlaceholderScreen';

const Stack = createNativeStackNavigator();

export function DiscoverStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="DiscoverMain">
        {(props) => <PlaceholderScreen {...props} title="Discover" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
