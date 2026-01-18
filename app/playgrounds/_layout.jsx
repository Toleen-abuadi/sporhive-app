// Playgrounds route group layout with auth guard.
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PlaygroundsProvider, usePlaygroundsStore } from '../../src/services/playgrounds/playgrounds.store';

function PlaygroundsLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const playgrounds = usePlaygroundsStore();
  const publicUserId = playgrounds?.publicUserId;
  const isIdentifyRoute = segments.includes('identify');
  const isTokenRoute = segments.includes('r');

  useEffect(() => {
    if (publicUserId || isIdentifyRoute || isTokenRoute) return;
    router.replace('/playgrounds/identify');
  }, [publicUserId, isIdentifyRoute, isTokenRoute, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function PlaygroundsLayout() {
  return (
    <PlaygroundsProvider>
      <PlaygroundsLayoutInner />
    </PlaygroundsProvider>
  );
}
