// app/portal/index.jsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { usePortal } from '../../src/services/portal/portal.store';

export default function PortalIndex() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = usePortal();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) router.replace('/(portal)/overview');
    else router.replace('/portal/login');
  }, [isAuthenticated, isLoading, router]);

  return null;
}
