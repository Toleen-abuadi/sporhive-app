import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { TopBar } from '../../src/components/ui/TopBar';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { Chip } from '../../src/components/ui/Chip';
import { TextField } from '../../src/components/ui/TextField';
import { spacing, typography } from '../../src/theme/tokens';
import { STORAGE_KEYS } from '../../src/services/storage/keys';
import { getJson, removeItem, setJson } from '../../src/services/storage/storage';
import {
  confirmPasswordReset,
  loginPublicUser,
  registerPublicUser,
  requestPasswordReset,
} from '../../src/features/playgrounds/api/playgrounds.api';

type BookingDraft = {
  venueId: string;
  academyProfileId: string;
  draft: {
    selectedDurationId?: string;
    bookingDate?: string;
    players?: number;
    selectedSlot?: { start_time: string; end_time: string };
    paymentType?: 'cash' | 'cliq';
    cashOnDate?: boolean;
    currentStep?: number;
  };
};

export default function PlaygroundsAuthScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (value: string) => {
    setPhone(value.replace(/\D/g, ''));
  };

  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ''), [phone]);
  const isPhoneValid = normalizedPhone.length >= 9 && normalizedPhone.length <= 15;
  const isPasswordValid = Boolean(password);
  const isRegisterValid =
    Boolean(firstName && lastName) && isPhoneValid && isPasswordValid && password === confirmPassword;
  const isLoginValid = isPhoneValid && isPasswordValid;
  const isResetRequestValid = isPhoneValid;
  const isResetConfirmValid =
    isPhoneValid && Boolean(otp) && Boolean(password) && password === confirmPassword;

  const handleResumeBooking = async () => {
    const draft = await getJson<BookingDraft>(STORAGE_KEYS.BOOKING_DRAFT);
    if (draft?.venueId) {
      const stepParam = draft.draft.currentStep ?? 1;
      router.replace(`/(playgrounds)/book/${draft.venueId}?step=${stepParam}`);
      return true;
    }
    return false;
  };

  const handleStoreAuth = async (user: Record<string, unknown>, client: Record<string, unknown>) => {
    await setJson(STORAGE_KEYS.PUBLIC_USER_MODE, 'registered');
    await setJson(STORAGE_KEYS.PUBLIC_USER, user);
    await setJson(STORAGE_KEYS.PLAYGROUNDS_CLIENT, client ?? user);
  };

  const handleSubmit = async () => {
    setError('');
    if (showReset) {
      if (resetStep === 'request') {
        if (!isResetRequestValid) {
          setError('Enter a valid phone number.');
          return;
        }
        setSubmitting(true);
        try {
          await requestPasswordReset({ phone: normalizedPhone });
          setResetStep('confirm');
        } catch (err) {
          setError('Unable to request reset. Try again.');
        } finally {
          setSubmitting(false);
        }
        return;
      }

      if (!isResetConfirmValid) {
        setError('Enter the OTP and matching passwords.');
        return;
      }
      setSubmitting(true);
      try {
        await confirmPasswordReset({ phone: normalizedPhone, token: otp, password });
        setShowReset(false);
        setResetStep('request');
      } catch (err) {
        setError('Unable to reset password. Try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'login') {
      if (!isLoginValid) {
        setError('Enter a valid phone and password.');
        return;
      }
      setSubmitting(true);
      try {
        const { user, client } = await loginPublicUser({
          phone: normalizedPhone,
          password,
        });
        await handleStoreAuth(user, client ?? user);
        const shouldResume = from === 'booking' || (await handleResumeBooking());
        if (!shouldResume) {
          router.replace('/(playgrounds)');
        }
        return;
      } catch (err) {
        setError('Login failed. Check your credentials.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!isRegisterValid) {
      setError('Complete all fields and ensure passwords match.');
      return;
    }
    setSubmitting(true);
    try {
      const { user, client } = await registerPublicUser({
        first_name: firstName,
        last_name: lastName,
        phone: normalizedPhone,
        password,
      });
      await handleStoreAuth(user, client ?? user);
      const shouldResume = from === 'booking' || (await handleResumeBooking());
      if (!shouldResume) {
        router.replace('/(playgrounds)');
      }
      return;
    } catch (err) {
      setError('Registration failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuest = async () => {
    await setJson(STORAGE_KEYS.PUBLIC_USER_MODE, 'guest');
    await removeItem(STORAGE_KEYS.PUBLIC_USER);
    await removeItem(STORAGE_KEYS.PLAYGROUNDS_CLIENT);
    router.replace('/(playgrounds)');
  };

  return (
    <Screen>
      <TopBar title="Playgrounds Auth" onBack={() => router.back()} />
      <View style={styles.container}>
        <View style={styles.tabsRow}>
          <Chip label="Login" selected={mode === 'login'} onPress={() => setMode('login')} />
          <Chip label="Register" selected={mode === 'register'} onPress={() => setMode('register')} />
        </View>

        {showReset ? (
          <View style={styles.section}>
            <Text style={styles.title}>Reset password</Text>
            <TextField
              placeholder="Phone number"
              value={phone}
              onChangeText={handlePhoneChange}
            />
            {resetStep === 'confirm' ? (
              <>
                <TextField placeholder="OTP" value={otp} onChangeText={setOtp} />
                <TextField placeholder="New password" value={password} onChangeText={setPassword} />
                <TextField placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} />
              </>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <PrimaryButton
              label={resetStep === 'request' ? 'Send OTP' : 'Reset password'}
              onPress={handleSubmit}
              disabled={submitting || (resetStep === 'request' ? !isResetRequestValid : !isResetConfirmValid)}
            />
            <Pressable onPress={() => { setShowReset(false); setResetStep('request'); }}>
              <Text style={styles.linkText}>Back to login</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.title}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </Text>
            {mode === 'register' ? (
              <>
                <TextField placeholder="First name" value={firstName} onChangeText={setFirstName} />
                <TextField placeholder="Last name" value={lastName} onChangeText={setLastName} />
              </>
            ) : null}
            <TextField placeholder="Phone number" value={phone} onChangeText={handlePhoneChange} />
            <TextField placeholder="Password" value={password} onChangeText={setPassword} />
            {mode === 'register' ? (
              <TextField
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <PrimaryButton
              label={mode === 'login' ? 'Login' : 'Register'}
              onPress={handleSubmit}
              disabled={submitting || (mode === 'login' ? !isLoginValid : !isRegisterValid)}
            />
            <Pressable onPress={() => { setShowReset(true); setResetStep('request'); }}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>
            <Pressable onPress={handleGuest}>
              <Text style={styles.linkText}>Continue as guest</Text>
            </Pressable>
          </View>
        )}
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
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  linkText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: '#2563EB',
    fontWeight: '600',
  },
  errorText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: '#DC2626',
  },
});
