// app/(portal)/index.js
import React from 'react';
import { Redirect } from 'expo-router';

export default function PortalIndex() {
  return <Redirect href="/(portal)/overview" />;
}
