import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { PlaygroundsBookingDetailsScreen } from '../../../src/screens/playgrounds/PlaygroundsBookingDetailsScreen';

export default function PlaygroundsBookingDetailsRoute() {
  const params = useLocalSearchParams();
  const bookingId = typeof params?.bookingId === 'string'
    ? params.bookingId
    : Array.isArray(params?.bookingId)
      ? params.bookingId[0]
      : null;

  return <PlaygroundsBookingDetailsScreen bookingId={bookingId} />;
}
