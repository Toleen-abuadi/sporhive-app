import { useCallback, useEffect, useState } from 'react';

import { requestCurrentLocation } from '../services/location/location';

export function useUserLocation({ autoRequest = true } = {}) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationError, setLocationError] = useState('');

  const requestLocation = useCallback(async () => {
    setLocationStatus('asking');
    setLocationError('');

    const result = await requestCurrentLocation();
    if (result?.ok && result?.coords) {
      setUserLocation(result.coords);
      setLocationStatus('granted');
      return result.coords;
    }

    setLocationStatus(result?.status || 'error');
    setLocationError(result?.error || 'Location is unavailable.');
    return null;
  }, []);

  useEffect(() => {
    if (!autoRequest) return;
    requestLocation();
  }, [autoRequest, requestLocation]);

  return {
    userLocation,
    setUserLocation,
    locationStatus,
    locationError,
    requestLocation,
  };
}

