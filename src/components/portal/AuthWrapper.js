// src/components/portal/AuthWrapper.js
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PortalProvider, usePortal } from '../../services/portal/portal.store';
import LoginScreen from '../../screens/portal/LoginScreen';
import { PortalTabNavigator } from '../../navigation/stacks/PortalTabNavigator';
import { colors, spacing } from '../../theme/portal.styles';

function AuthGuard() {
  const { isAuthenticated, isInitialized } = usePortal();
  const navigation = useNavigation();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!isInitialized || isNavigating) return;

    if (isAuthenticated) {
      setIsNavigating(true);
      navigation.reset({
        index: 0,
        routes: [{ name: 'PortalMain' }],
      });
    } else {
      setIsNavigating(true);
      navigation.reset({
        index: 0,
        routes: [{ name: 'PortalLogin' }],
      });
    }

    // Reset navigating state after a short delay
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isInitialized, navigation, isNavigating]);

  // Show loading screen while checking auth
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Return null since navigation will handle the screen
  return null;
}

export default function AuthWrapper() {
  return (
    <PortalProvider>
      <AuthGuard />
    </PortalProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Export for direct use if needed
export { LoginScreen } from '../../screens/portal/LoginScreen';
export { PortalTabNavigator } from '../../navigation/stacks/PortalTabNavigator';
