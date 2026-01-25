import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/services/auth/auth.store';
import { useToast } from '../../src/components/ui/ToastHost';
import { useTranslation } from '../../src/services/i18n/i18n';

export default function PortalLayout() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const { session } = useAuth();

  useEffect(() => {
    const userType = session?.user?.type || session?.login_as;
    const hasPortalToken = Boolean(session?.portal_tokens?.access || session?.portal_tokens?.access_token);
    if (userType && userType !== 'player') {
      router.replace('/(app)/services');
      return;
    }
    if (userType === 'player' && !hasPortalToken) {
      toast.warning(t('portal.errors.sessionExpiredDescription'));
      router.replace('/(auth)/login?mode=player');
    }
  }, [router, session, t, toast]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
