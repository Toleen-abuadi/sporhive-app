// app/index.js
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { useTheme } from '../src/theme/ThemeProvider';

// 1) Global notification behavior (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function handleRegistrationError(message) {
  // You can swap this to your toast system
  alert(message);
  throw new Error(message);
}

async function registerForPushNotificationsAsync() {
  // Android channel (required for high-importance notifications)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    handleRegistrationError('Must use physical device for push notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    handleRegistrationError(
      'Permission not granted to get push token for push notification!'
    );
    return null;
  }

  // EAS Project ID (needed for getExpoPushTokenAsync in modern Expo)
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    handleRegistrationError('Project ID not found');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token;
}

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();

  // keep refs so we can remove listeners safely
  const notificationListenerRef = useRef(null);
  const responseListenerRef = useRef(null);

  useEffect(() => {
    // 2) Register push token + set up listeners
    const setupNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          console.log('Expo Push Token:', token);

          // OPTIONAL: persist token or send to backend
          // await storage.setItem(APP_STORAGE_KEYS.EXPO_PUSH_TOKEN, token);
          // await myApi.savePushToken({ token });
        }
      } catch (e) {
        console.log('Push registration error:', e);
      }

      // Foreground receive
      notificationListenerRef.current =
        Notifications.addNotificationReceivedListener((notification) => {
          // You can show an in-app banner/toast here
          console.log('Notification received (foreground):', notification);
        });

      // User taps notification
      responseListenerRef.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          console.log('Notification response (tap):', response);

          // OPTIONAL: deep link routing example
          // const data = response?.notification?.request?.content?.data;
          // if (data?.route) router.push(data.route);
        });
    };

    setupNotifications();

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
        notificationListenerRef.current = null;
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
        responseListenerRef.current = null;
      }
    };
  }, [router]);

  useEffect(() => {
    router.replace('/services');
  }, [router]);

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
