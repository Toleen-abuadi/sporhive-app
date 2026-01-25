import React from 'react';
import { Redirect } from 'expo-router';

export default function PlaygroundsAuthRoute() {
  return <Redirect href="/(auth)/login" />;
}
