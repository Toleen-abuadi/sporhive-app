import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { PlaygroundsBookingStepperScreen } from '../../../src/screens/playgrounds/PlaygroundsBookingStepperScreen';

export default function PlaygroundsBookingRoute() {
  const params = useLocalSearchParams();
  const venueId = typeof params?.venueId === 'string'
    ? params.venueId
    : Array.isArray(params?.venueId)
      ? params.venueId[0]
      : null;

  return <PlaygroundsBookingStepperScreen venueId={venueId} />;
}
