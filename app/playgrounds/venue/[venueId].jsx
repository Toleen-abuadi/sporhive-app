import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { PlaygroundsVenueDetailsScreen } from '../../../src/screens/playgrounds/PlaygroundsVenueDetailsScreen';

export default function PlaygroundsVenueDetailsRoute() {
  const params = useLocalSearchParams();
  const venueId = typeof params?.venueId === 'string'
    ? params.venueId
    : Array.isArray(params?.venueId)
      ? params.venueId[0]
      : null;

  return <PlaygroundsVenueDetailsScreen venueId={venueId} />;
}
