import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlaceholderScreen } from '../../screens/placeholders/PlaceholderScreen';

const Stack = createNativeStackNavigator();

export function BookingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="BookingMain">
        {(props) => <PlaceholderScreen {...props} title="Book" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
