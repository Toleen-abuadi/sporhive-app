import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppScreen } from '../src/components/ui/AppScreen';
import { AppHeader } from '../src/components/ui/AppHeader';
import { Button } from '../src/components/ui/Button';
import { Text } from '../src/components/ui/Text';
import { useTheme } from '../src/theme/ThemeProvider';
import { useTranslation } from '../src/services/i18n/i18n';
import { useAuth } from '../src/services/auth/auth.store';
import { spacing } from '../src/theme/tokens';

export default function MissingRouteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const { isAuthenticated, token, session } = useAuth();

  const signedIn = Boolean(isAuthenticated || token || session);

  return (
    <AppScreen safe>
      <AppHeader title={t('nav.notFoundTitle')} showBack={false} />
      <View style={styles.container}>
        <Text
          variant="h3"
          weight="bold"
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {t('nav.notFoundTitle')}
        </Text>
        <Text
          variant="body"
          color={colors.textSecondary}
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {t('nav.notFoundMessage')}
        </Text>
        <View style={styles.actions}>
          <Button onPress={() => router.replace('/')}>{t('nav.goHome')}</Button>
          {!signedIn ? (
            <Button variant="secondary" onPress={() => router.replace('/(auth)/login')}>
              {t('nav.goToLogin')}
            </Button>
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});

