import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
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

const MODES = {
  LOGIN: 'login',
  REGISTER: 'register',
};

const RESET_STEPS = {
  REQUEST: 1,
  CONFIRM: 2,
};

const normalizePhoneDigits = (raw) => String(raw || '').replace(/[^\d]/g, '');

const validatePhoneRealtime = (raw) => {
  const v = String(raw || '');
  const digits = normalizePhoneDigits(v);

  if (!v.trim()) {
    return {
      ok: false,
      soft: true,
      message: 'Enter your phone number to continue.',
    };
  }

  const hasLetters = /[A-Za-z]/.test(v);
  if (hasLetters) {
    return {
      ok: false,
      soft: false,
      message: 'Phone number must contain digits only.',
    };
  }

  if (digits.length < 9 || digits.length > 15) {
    return {
      ok: false,
      soft: false,
      message: 'Phone number must be between 9 and 15 digits.',
    };
  }

  return { ok: true };
};

const getErrorMessage = (err) => {
  const detail = err?.detail || err?.response?.data?.detail;
  const msg =
    detail ||
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    'Something went wrong. Please try again.';
  return msg;
};

export function PlaygroundsAuthScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { fromBooking } = useLocalSearchParams();

  const [mode, setMode] = useState(MODES.LOGIN);

  // Login state (mirror web: phone + password + rememberMe)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Register state (mirror web)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerGender, setRegisterGender] = useState(''); // optional if you later add gender selector
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Reset password state (mirror web reset panel)
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState(RESET_STEPS.REQUEST);
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [error, setError] = useState('');
  const [loginPhoneHint, setLoginPhoneHint] = useState(null);
  const [registerPhoneHint, setRegisterPhoneHint] = useState(null);
  const [resetPhoneHint, setResetPhoneHint] = useState(null);

  const pageTitle = useMemo(() => {
    if (mode === MODES.REGISTER) return 'Create your SporHive account';
    return 'Welcome back';
  }, [mode]);

  const pageSubtitle = useMemo(() => {
    if (mode === MODES.REGISTER) return 'Join and book venues faster with your profile.';
    return 'Sign in to continue your booking and manage reservations.';
  }, [mode]);

  const goAfterAuth = useCallback(async () => {
    const draft = await getBookingDraft();
    if (fromBooking === '1' && draft?.venueId) {
      router.replace(`/playgrounds/book/${draft.venueId}`);
    } else {
      router.replace('/playgrounds/explore');
    }
  }, [fromBooking, router]);

  const onChangeMode = useCallback((value) => {
    setMode(value);
    setError('');
    setResetOpen(false);
    setResetStep(RESET_STEPS.REQUEST);
  }, []);

  // Live hints
  useEffect(() => {
    if (!loginPhone) {
      setLoginPhoneHint(null);
      return;
    }
    const res = validatePhoneRealtime(loginPhone);
    setLoginPhoneHint(res.ok ? null : res);
  }, [loginPhone]);

  useEffect(() => {
    if (!registerPhone) {
      setRegisterPhoneHint(null);
      return;
    }
    const res = validatePhoneRealtime(registerPhone);
    setRegisterPhoneHint(res.ok ? null : res);
  }, [registerPhone]);

  useEffect(() => {
    if (!resetPhone) {
      setResetPhoneHint(null);
      return;
    }
    const res = validatePhoneRealtime(resetPhone);
    setResetPhoneHint(res.ok ? null : res);
  }, [resetPhone]);

  const openReset = useCallback(() => {
    setError('');
    setResetOpen(true);
    setResetStep(RESET_STEPS.REQUEST);
    // mirror web: prefill reset phone from login phone if available
    setResetPhone((prev) => (loginPhone?.trim() ? loginPhone.trim() : prev));
  }, [loginPhone]);

  const closeReset = useCallback(() => {
    setResetOpen(false);
    setResetStep(RESET_STEPS.REQUEST);
    setResetCode('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setError('');
  }, []);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (!loginPhone.trim() || !loginPassword) {
        setError('Please enter your phone and password.');
        return;
      }

      const phoneRes = validatePhoneRealtime(loginPhone);
      if (!phoneRes.ok && !phoneRes.soft) {
        setError(phoneRes.message);
        return;
      }

      const res = await endpoints.publicUsers.login({
        phone: loginPhone.trim(),
        password: loginPassword,
        remember_me: rememberMe ? true : false, // harmless if backend ignores
      });

      const user = res?.user || res?.data?.user || res?.data || res;
      const clientState =
        res?.playgrounds_client ||
        res?.data?.playgrounds_client ||
        res?.playground_client ||
        res?.data?.playground_client ||
        res?.client ||
        res?.data?.client ||
        null;

      if (!user?.id) {
        setError('Invalid phone or password.');
        return;
      }

      await setPublicUser(user);
      await setPublicUserMode('registered');
      if (clientState) await setPlaygroundsClientState(clientState);

      await goAfterAuth();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [goAfterAuth, loginPassword, loginPhone, rememberMe]);

  const handleRegister = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Please enter your first and last name.');
        return;
      }

      if (!registerPhone.trim()) {
        setError('Please enter your phone number.');
        return;
      }

      const phoneRes = validatePhoneRealtime(registerPhone);
      if (!phoneRes.ok && !phoneRes.soft) {
        setError(phoneRes.message);
        return;
      }

      if (!registerPassword || registerPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      if (registerPassword !== registerConfirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      const res = await endpoints.publicUsers.register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: registerPhone.trim(),
        email: registerEmail.trim() || null,
        gender: registerGender || null,
        password: registerPassword,
      });

      const user = res?.user || res?.data?.user || res?.data || res;
      const clientState =
        res?.playgrounds_client ||
        res?.data?.playgrounds_client ||
        res?.playground_client ||
        res?.data?.playground_client ||
        res?.client ||
        res?.data?.client ||
        null;

      if (!user?.id) {
        setError('Unable to create your account. Please try again.');
        return;
      }

      await setPublicUser(user);
      await setPublicUserMode('registered');
      if (clientState) await setPlaygroundsClientState(clientState);

      await goAfterAuth();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [
    firstName,
    goAfterAuth,
    lastName,
    registerConfirmPassword,
    registerEmail,
    registerGender,
    registerPassword,
    registerPhone,
  ]);

  const handleResetRequest = useCallback(async () => {
    setResetLoading(true);
    setError('');

    try {
      if (!resetPhone.trim()) {
        setError('Please enter your phone number.');
        return;
      }

      const phoneRes = validatePhoneRealtime(resetPhone);
      if (!phoneRes.ok && !phoneRes.soft) {
        setError(phoneRes.message);
        return;
      }

      // mirror web: /password-reset/request { phone }
      await endpoints.publicUsers.passwordResetRequest({
        phone: resetPhone.trim(),
      });

      setResetStep(RESET_STEPS.CONFIRM);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResetLoading(false);
    }
  }, [resetPhone]);

  const handleResetConfirm = useCallback(async () => {
    setResetLoading(true);
    setError('');

    try {
      if (!resetPhone.trim() || !resetCode.trim() || !resetNewPassword || !resetConfirmPassword) {
        setError('Please fill all reset fields.');
        return;
      }

      if (resetNewPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      if (resetNewPassword !== resetConfirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      // mirror web: /password-reset/confirm { phone, reset_code, new_password }
      await endpoints.publicUsers.passwordResetConfirm({
        phone: resetPhone.trim(),
        reset_code: resetCode.trim(),
        new_password: resetNewPassword,
      });

      // mirror web behavior: close reset, keep phone in login
      setLoginPhone(resetPhone.trim());
      setLoginPassword('');
      closeReset();
      setMode(MODES.LOGIN);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResetLoading(false);
    }
  }, [closeReset, resetCode, resetConfirmPassword, resetNewPassword, resetPhone]);

  const onPrimaryAction = useCallback(() => {
    if (mode === MODES.LOGIN) return handleLogin();
    return handleRegister();
  }, [handleLogin, handleRegister, mode]);

  return (
    <Screen safe>
      <AppHeader title="Playgrounds access" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero (mirror web card header) */}
          <View style={styles.hero}>
            <Text variant="title" style={{ textAlign: 'center' }}>
              {pageTitle}
            </Text>
            <Text
              variant="bodySmall"
              color={colors.textSecondary}
              style={{ textAlign: 'center', marginTop: spacing.xs }}
            >
              {pageSubtitle}
            </Text>
          </View>

          {/* Auth Card */}
          <View style={[styles.card, { borderColor: colors.border }]}>
            <SegmentedControl
              value={mode}
              onChange={onChangeMode}
              options={[
                { value: MODES.LOGIN, label: 'Sign in' },
                { value: MODES.REGISTER, label: 'Sign up' },
              ]}
            />

            {/* Error (mirror web alert box) */}
            {error ? (
              <View style={[styles.errorBox, { borderColor: colors.error }]}>
                <Text variant="caption" color={colors.error} style={{ flex: 1 }}>
                  {error}
                </Text>
                <Pressable onPress={() => setError('')} hitSlop={10}>
                  <Text variant="caption" color={colors.error}>
                    ✕
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* LOGIN */}
            {mode === MODES.LOGIN ? (
              <>
                <Input
                  label="Phone number"
                  value={loginPhone}
                  onChangeText={setLoginPhone}
                  placeholder="+962 7XX XXX XXX"
                  keyboardType="phone-pad"
                  accessibilityLabel="Login phone"
                />
                {loginPhoneHint?.message ? (
                  <Text
                    variant="caption"
                    color={loginPhoneHint.soft ? colors.textSecondary : colors.error}
                    style={{ marginTop: -6 }}
                  >
                    {loginPhoneHint.message}
                  </Text>
                ) : (
                  <Text variant="caption" color={colors.textSecondary} style={{ marginTop: -6 }}>
                    Tip: include country code if needed (e.g., +962…).
                  </Text>
                )}

                <Input
                  label="Password"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  accessibilityLabel="Login password"
                />

                {/* Remember me + Forgot password (mirror web row) */}
                <View style={styles.rowBetween}>
                  <Pressable
                    onPress={() => setRememberMe((v) => !v)}
                    hitSlop={10}
                    style={styles.rememberRow}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: rememberMe ? colors.primary : colors.border,
                          backgroundColor: rememberMe ? colors.primary : 'transparent',
                        },
                      ]}
                    />
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      Remember me
                    </Text>
                  </Pressable>

                  <Pressable onPress={openReset} hitSlop={10}>
                    <Text variant="bodySmall" color={colors.primary}>
                      Forgot password?
                    </Text>
                  </Pressable>
                </View>

                {/* Reset panel (inline, 2 steps) */}
                {resetOpen ? (
                  <View style={[styles.resetPanel, { borderColor: colors.border }]}>
                    <View style={styles.rowBetween}>
                      <Text variant="bodySmall" style={{ fontWeight: '700' }}>
                        Reset your password
                      </Text>
                      <Pressable onPress={closeReset} hitSlop={10}>
                        <Text variant="bodySmall" color={colors.textSecondary}>
                          ✕
                        </Text>
                      </Pressable>
                    </View>

                    {resetStep === RESET_STEPS.REQUEST ? (
                      <>
                        <Input
                          label="Phone number"
                          value={resetPhone}
                          onChangeText={setResetPhone}
                          placeholder="+962 7XX XXX XXX"
                          keyboardType="phone-pad"
                          accessibilityLabel="Reset phone"
                        />
                        {resetPhoneHint?.message ? (
                          <Text
                            variant="caption"
                            color={resetPhoneHint.soft ? colors.textSecondary : colors.error}
                            style={{ marginTop: -6 }}
                          >
                            {resetPhoneHint.message}
                          </Text>
                        ) : null}

                        <Button
                          onPress={handleResetRequest}
                          loading={resetLoading}
                          accessibilityLabel="Send reset code"
                        >
                          Send reset code
                        </Button>
                      </>
                    ) : (
                      <>
                        <Input
                          label="Reset code"
                          value={resetCode}
                          onChangeText={setResetCode}
                          placeholder="Code from SMS"
                          keyboardType="number-pad"
                          accessibilityLabel="Reset code"
                        />

                        <Input
                          label="New password"
                          value={resetNewPassword}
                          onChangeText={setResetNewPassword}
                          placeholder="New password"
                          secureTextEntry
                          accessibilityLabel="New password"
                        />

                        <Input
                          label="Confirm password"
                          value={resetConfirmPassword}
                          onChangeText={setResetConfirmPassword}
                          placeholder="Confirm password"
                          secureTextEntry
                          accessibilityLabel="Confirm password"
                        />

                        <Button
                          onPress={handleResetConfirm}
                          loading={resetLoading}
                          accessibilityLabel="Update password"
                        >
                          Update password
                        </Button>

                        <Pressable
                          onPress={() => setResetStep(RESET_STEPS.REQUEST)}
                          hitSlop={10}
                          style={{ marginTop: spacing.xs }}
                        >
                          <Text
                            variant="bodySmall"
                            color={colors.textSecondary}
                            style={{ textAlign: 'center' }}
                          >
                            Back to code request
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                ) : null}
              </>
            ) : null}

            {/* REGISTER */}
            {mode === MODES.REGISTER ? (
              <>
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

                <Input
                  label="Phone number"
                  value={registerPhone}
                  onChangeText={setRegisterPhone}
                  placeholder="+962 7XX XXX XXX"
                  keyboardType="phone-pad"
                  accessibilityLabel="Register phone"
                />
                {registerPhoneHint?.message ? (
                  <Text
                    variant="caption"
                    color={registerPhoneHint.soft ? colors.textSecondary : colors.error}
                    style={{ marginTop: -6 }}
                  >
                    {registerPhoneHint.message}
                  </Text>
                ) : (
                  <Text variant="caption" color={colors.textSecondary} style={{ marginTop: -6 }}>
                    Tip: include country code if needed (e.g., +962…).
                  </Text>
                )}

                <Input
                  label="Email (optional)"
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accessibilityLabel="Register email"
                />

                {/* If you want a gender selector later, you can swap this Input to a Select/Picker component */}
                {/* <Input label="Gender (optional)" value={registerGender} onChangeText={setRegisterGender} /> */}

                <Input
                  label="Password"
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  placeholder="Create a strong password"
                  secureTextEntry
                  accessibilityLabel="Register password"
                />

                <Input
                  label="Confirm password"
                  value={registerConfirmPassword}
                  onChangeText={setRegisterConfirmPassword}
                  placeholder="Re-enter your password"
                  secureTextEntry
                  accessibilityLabel="Register confirm password"
                />
              </>
            ) : null}

            <Button onPress={onPrimaryAction} loading={loading} accessibilityLabel="Continue">
              {mode === MODES.LOGIN ? 'Sign in to continue' : 'Create account'}
            </Button>

            {/* Footer hint (mirror: resume booking) */}
            <View style={styles.footerHint}>
              <Text variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center' }}>
                We’ll resume your booking after you sign in.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  hero: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resetPanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footerHint: {
    paddingTop: spacing.xs,
  },
});
