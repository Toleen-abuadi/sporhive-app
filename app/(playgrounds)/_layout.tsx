import React from 'react';
import { Stack } from 'expo-router';

export default function PlaygroundsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="venue/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="book/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth" />
      <Stack.Screen name="my-bookings" />
      <Stack.Screen name="r/[token]" />
      <Stack.Screen name="rate" />
    </Stack>
  );
}
