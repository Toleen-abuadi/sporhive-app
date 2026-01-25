// app/index.js
import React from 'react';
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(app)/services" />;
}
