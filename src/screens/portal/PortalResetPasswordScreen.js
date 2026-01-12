import React from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { Button } from '../../components/ui/Button';
import { spacing } from '../../theme/tokens';

export function PortalResetPasswordScreen() {
  const router = useRouter();

  return (
    <Screen scroll contentContainerStyle={styles.scroll}>
      <PortalHeader title="Reset password" subtitle="We’ll help you regain access" />
      <PortalEmptyState
        icon="key"
        title="Password reset coming soon"
        description="We’re preparing a secure reset flow for the player portal."
        action={
          <Button variant="secondary" onPress={() => router.back()}>
            Back to login
          </Button>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
});
