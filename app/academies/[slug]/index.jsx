import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AcademyTemplateScreen } from '../../../src/screens/AcademyTemplateScreen';

export default function AcademyTemplateRoute() {
  const params = useLocalSearchParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  return <AcademyTemplateScreen slug={slug} />;
}
