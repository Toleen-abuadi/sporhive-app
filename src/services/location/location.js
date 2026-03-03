import { PermissionsAndroid, Platform } from 'react-native';

import { normalizeLatLng } from '../../utils/map';

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 60000,
};

const getExpoLocationModule = () => {
  try {
    return require('expo-location');
  } catch {
    return null;
  }
};

const formatErrorMessage = (error, fallback) => {
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error?.message) return String(error.message);
  return fallback;
};

const getCurrentPositionFromNavigator = (options) =>
  new Promise((resolve, reject) => {
    const geolocation = global?.navigator?.geolocation;
    if (!geolocation?.getCurrentPosition) {
      reject(new Error('Geolocation is unavailable on this device.'));
      return;
    }

    geolocation.getCurrentPosition(resolve, reject, options);
  });

export async function requestCurrentLocation(options = {}) {
  const requestOptions = { ...DEFAULT_OPTIONS, ...(options || {}) };
  const expoLocation = getExpoLocationModule();

  if (expoLocation?.requestForegroundPermissionsAsync && expoLocation?.getCurrentPositionAsync) {
    try {
      const permission = await expoLocation.requestForegroundPermissionsAsync();
      if (permission?.status !== 'granted') {
        return {
          ok: false,
          status: permission?.canAskAgain === false ? 'blocked' : 'denied',
          error: 'Location permission was not granted.',
        };
      }

      const accuracy = expoLocation?.Accuracy?.Balanced ?? expoLocation?.Accuracy?.Highest;
      const response = await expoLocation.getCurrentPositionAsync({ accuracy });
      const coords = normalizeLatLng({
        lat: response?.coords?.latitude,
        lng: response?.coords?.longitude,
      });

      if (!coords) {
        return {
          ok: false,
          status: 'error',
          error: 'Could not read device coordinates.',
        };
      }

      return { ok: true, status: 'granted', coords };
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        error: formatErrorMessage(error, 'Could not get current location.'),
      };
    }
  }

  if (Platform.OS === 'android' && PermissionsAndroid?.request) {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return {
          ok: false,
          status:
            result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied',
          error: 'Location permission was not granted.',
        };
      }
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        error: formatErrorMessage(error, 'Could not request location permission.'),
      };
    }
  }

  try {
    const response = await getCurrentPositionFromNavigator(requestOptions);
    const coords = normalizeLatLng({
      lat: response?.coords?.latitude,
      lng: response?.coords?.longitude,
    });

    if (!coords) {
      return {
        ok: false,
        status: 'error',
        error: 'Could not read device coordinates.',
      };
    }

    return { ok: true, status: 'granted', coords };
  } catch (error) {
    const message = formatErrorMessage(error, 'Location is unavailable.');
    const lowered = message.toLowerCase();

    let status = 'error';
    if (lowered.includes('denied') || lowered.includes('permission')) {
      status = 'denied';
    } else if (
      lowered.includes('unavailable') ||
      lowered.includes('not support') ||
      lowered.includes('not implemented')
    ) {
      status = 'unavailable';
    }

    return { ok: false, status, error: message };
  }
}

