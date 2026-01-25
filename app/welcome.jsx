import React from 'react';
import { Redirect } from 'expo-router';

export default function Welcome() {
  return <Redirect href="/(auth)/welcome" />;
}
