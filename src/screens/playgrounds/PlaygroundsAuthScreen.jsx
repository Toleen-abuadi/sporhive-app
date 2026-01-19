import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Input } from '../../components/ui/Input';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { endpoints } from '../../services/api/endpoints';
import {
  getBookingDraft,
  setPlaygroundsClientState,
  setPublicUser,
  setPublicUserMode,
} from '../../services/playgrounds/storage';
import { spacing } from '../../theme/tokens';

export function PlaygroundsAuthScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { fromBooking } = useLocalSearchParams();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedPhone = useMemo(() => {
    if (!phone) return '';
    const digits = phone.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) return digits;
    return `+${digits}`;
  }, [phone]);

  const handleAuth = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'forgot') {
        if (!email) {
          setError('Please enter your email.');
          return;
        }
        await endpoints.publicUsers.passwordResetRequest({ email });
        setMode('reset');
        return;
      }

      if (mode === 'reset') {
        if (!email || !resetToken || !password || password !== confirmPassword) {
          setError('Please provide a valid token and matching passwords.');
          return;
        }
        await endpoints.publicUsers.passwordResetConfirm({
          email,
          token: resetToken,
          password,
          password_confirmation: confirmPassword,
        });
        setMode('login');
        return;
      }

      if (!email || !password) {
        setError('Email and password are required.');
        return;
      }
      if (mode === 'register' && (!firstName || !lastName || !normalizedPhone)) {
        setError('Please provide your name and phone number.');
        return;
      }

      const payload =
        mode === 'login'
          ? { email, password }
          : { email, password, first_name: firstName, last_name: lastName, phone: normalizedPhone };
      const res = mode === 'login'
        ? await endpoints.publicUsers.login(payload)
        : await endpoints.publicUsers.register(payload);

      const user = res?.user || res?.data?.user || res?.data || res;
      const clientState = res?.playgrounds_client || res?.data?.playgrounds_client || res?.client || res?.data?.client;
      if (!user?.id) {
        setError('Unable to authenticate. Please check your details.');
        return;
      }
      await setPublicUser(user);
      await setPublicUserMode('registered');
      if (clientState) {
        await setPlaygroundsClientState(clientState);
      }

      const draft = await getBookingDraft();
      if (fromBooking === '1' && draft?.venueId) {
        router.replace(`/playgrounds/book/${draft.venueId}`);
      } else {
        router.replace('/playgrounds/explore');
      }
    } catch (err) {
      const detail = err?.detail || err?.response?.data?.detail;
      setError(detail || err?.message || 'Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  }, [confirmPassword, email, firstName, fromBooking, lastName, mode, normalizedPhone, password, resetToken, router]);

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
            { value: 'forgot', label: 'Forgot' },
            { value: 'reset', label: 'Reset' },
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
        {mode === 'forgot' || mode === 'reset' || mode === 'login' || mode === 'register' ? (
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="name@email.com"
            keyboardType="email-address"
            accessibilityLabel="Email"
          />
        ) : null}
        {mode !== 'forgot' ? (
          <Input
            label={mode === 'reset' ? 'New password' : 'Password'}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            accessibilityLabel="Password"
          />
        ) : null}
        {mode === 'reset' ? (
          <>
            <Input
              label="Reset token"
              value={resetToken}
              onChangeText={setResetToken}
              placeholder="Token from email"
              accessibilityLabel="Reset token"
            />
            <Input
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              secureTextEntry
              accessibilityLabel="Confirm password"
            />
          </>
        ) : null}
        {error ? (
          <Text variant="caption" color={colors.error}>
            {error}
          </Text>
        ) : null}
        <Button onPress={handleAuth} loading={loading} accessibilityLabel="Continue">
          {mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Reset password' : 'Continue'}
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
