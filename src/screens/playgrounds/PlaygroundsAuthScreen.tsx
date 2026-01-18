import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Input } from '../../components/ui/Input';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { endpoints } from '../../services/api/endpoints';
import { getBookingDraft, setPublicUser, setPublicUserMode } from '../../services/playgrounds/storage';
import { BookingDraftStorage, PublicUser } from '../../services/playgrounds/types';
import { spacing } from '../../theme/tokens';

export function PlaygroundsAuthScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload =
        mode === 'login'
          ? { email, password }
          : { email, password, first_name: firstName, last_name: lastName, phone };
      const res = mode === 'login'
        ? await endpoints.publicUsers.login(payload)
        : await endpoints.publicUsers.register(payload);

      const user: PublicUser = res?.user || res?.data?.user || res?.data || res;
      if (!user?.id) {
        setError('Unable to authenticate. Please check your details.');
        return;
      }
      await setPublicUser(user);
      await setPublicUserMode('registered');

      const draft = await getBookingDraft<BookingDraftStorage>();
      if (draft?.venueId) {
        router.replace(`/playgrounds/book/${draft.venueId}`);
      } else {
        router.replace('/playgrounds/explore');
      }
    } catch (err) {
      setError(err?.message || 'Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  }, [email, firstName, lastName, mode, password, phone, router]);

  useEffect(() => {
    setError('');
  }, [mode]);

  return (
    <Screen safe>
      <AppHeader title="Playgrounds access" />
      <View style={styles.container}>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: 'login', label: 'Sign in' },
            { value: 'register', label: 'Register' },
          ]}
        />
        {mode === 'register' ? (
          <View style={styles.row}>
            <Input
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              style={styles.rowInput}
              accessibilityLabel="First name"
            />
            <Input
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              style={styles.rowInput}
              accessibilityLabel="Last name"
            />
          </View>
        ) : null}
        {mode === 'register' ? (
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+962..."
            keyboardType="phone-pad"
            accessibilityLabel="Phone number"
          />
        ) : null}
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@email.com"
          keyboardType="email-address"
          accessibilityLabel="Email"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          accessibilityLabel="Password"
        />
        {error ? (
          <Text variant="caption" color={colors.error}>
            {error}
          </Text>
        ) : null}
        <Button onPress={handleAuth} loading={loading} accessibilityLabel="Continue">
          Continue
        </Button>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          We’ll resume your booking after sign in.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowInput: {
    flex: 1,
  },
});
