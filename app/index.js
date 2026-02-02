// app/index.js
import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { useTheme } from '../src/theme/ThemeProvider';
import { useTranslation } from '../src/services/i18n/i18n';

// 1) Global notification behavior (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Index() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const notificationListenerRef = useRef(null);
  const responseListenerRef = useRef(null);

  const handleRegistrationError = useCallback(
    (messageKey) => {
      const message = t(messageKey);
      // swap later to toast
      alert(message);
      throw new Error(message);
    },
    [t]
  );

  const registerForPushNotificationsAsync = useCallback(async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (!Device.isDevice) {
      handleRegistrationError('errors.notifications.deviceRequired');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      handleRegistrationError('errors.notifications.permissionDenied');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      handleRegistrationError('errors.notifications.projectIdMissing');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  }, [handleRegistrationError]);

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) console.log('Expo Push Token:', token);
      } catch (e) {
        console.log('Push registration error:', e);
      }

      notificationListenerRef.current =
        Notifications.addNotificationReceivedListener((notification) => {
          console.log('Notification received (foreground):', notification);
        });

      responseListenerRef.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          console.log('Notification response (tap):', response);
          // deep link handling can live here later
        });
    };

    setupNotifications();

    return () => {
      notificationListenerRef.current?.remove?.();
      responseListenerRef.current?.remove?.();
      notificationListenerRef.current = null;
      responseListenerRef.current = null;
    };
  }, [registerForPushNotificationsAsync]);

  // ✅ IMPORTANT: no router.replace here. AuthGate owns routing.
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.accentOrange} />
    </View>
  );
}
