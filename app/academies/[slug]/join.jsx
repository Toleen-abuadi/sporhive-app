import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { JoinAcademyScreen } from '../../../src/screens/JoinAcademyScreen';

export default function JoinAcademyRoute() {
  const params = useLocalSearchParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  return <JoinAcademyScreen slug={slug} />;
}
