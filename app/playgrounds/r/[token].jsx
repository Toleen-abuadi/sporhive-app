import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { PlaygroundsRatingScreen } from '../../../src/screens/playgrounds/PlaygroundsRatingScreen';
import { playgroundsApi } from '../../../src/services/playgrounds/playgrounds.api';

export default function PlaygroundsRatingTokenRoute() {
  const params = useLocalSearchParams();
  const token = typeof params?.token === 'string'
    ? params.token
    : Array.isArray(params?.token)
      ? params.token[0]
      : null;
  const [preflight, setPreflight] = useState({
    loading: true,
    allowed: false,
    message: '',
    bookingId: null,
    userId: null,
  });

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!token) {
        if (!mounted) return;
        setPreflight({
          loading: false,
          allowed: false,
          message: 'Invalid rating link.',
          bookingId: null,
          userId: null,
        });
        return;
      }

      const resolved = await playgroundsApi.resolveRatingToken(token);
      if (!mounted) return;

      if (!resolved?.success) {
        setPreflight({
          loading: false,
          allowed: false,
          message: resolved?.error?.message || 'Unable to resolve rating link.',
          bookingId: null,
          userId: null,
        });
        return;
      }

      const data = resolved.data || {};
      const bookingId = data.booking_id || data.bookingId || data.id || null;
      const userId = data.user_id || data.userId || null;

      const canRate = await playgroundsApi.canRate({ booking_id: bookingId, user_id: userId });
      if (!mounted) return;

      if (!canRate?.success || canRate?.data?.allowed === false || canRate?.data?.can_rate === false) {
        setPreflight({
          loading: false,
          allowed: false,
          message: canRate?.data?.message || 'This booking is not eligible for rating.',
          bookingId,
          userId,
        });
        return;
      }

      setPreflight({
        loading: false,
        allowed: true,
        message: '',
        bookingId,
        userId,
      });
    };

    run();

    return () => {
      mounted = false;
    };
  }, [token]);

  return <PlaygroundsRatingScreen mode="token" token={token} preflight={preflight} />;
}
