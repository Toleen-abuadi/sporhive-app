import React from 'react';
import { Redirect } from 'expo-router';

export default function PlaygroundsIndex() {
  return <Redirect href="/playgrounds/explore" />;
}
