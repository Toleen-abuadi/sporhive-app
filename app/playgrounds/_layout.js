// Playgrounds route group layout with themed stack headers.
import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeProvider';
import { goToMyBookings } from '../../src/navigation/playgrounds.routes';

function HeaderIconButton({ icon, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.headerButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <Feather name={icon} size={16} color={colors.textPrimary} />
    </Pressable>
  );
}

export default function PlaygroundsLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '600' },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        headerBlurEffect: isDark ? 'dark' : 'light',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Playgrounds',
          headerLargeTitle: true,
          headerTransparent: true,
          headerRight: () => <HeaderIconButton icon="calendar" onPress={() => goToMyBookings(router)} />,
        }}
      />
      <Stack.Screen name="identify" options={{ title: 'Identify' }} />
      <Stack.Screen name="search" options={{ title: 'Search' }} />
      <Stack.Screen
        name="venue/[venueId]"
        options={{
          title: 'Venue',
          headerTransparent: true,
          headerRight: () => <HeaderIconButton icon="share" onPress={() => {}} />,
        }}
      />
      <Stack.Screen
        name="book/[venueId]"
        options={{
          title: 'Book',
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen name="my-bookings" options={{ title: 'My Bookings' }} />
      <Stack.Screen name="booking/[bookingId]" options={{ title: 'Booking Details' }} />
      <Stack.Screen name="rate" options={{ title: 'Rate Booking' }} />
      <Stack.Screen name="r/[token]" options={{ title: 'Rate Booking' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
