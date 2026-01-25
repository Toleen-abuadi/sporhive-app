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

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Input } from '../../components/ui/Input';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { BackButton } from '../../components/ui/BackButton';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';

import { endpoints } from '../../services/api/endpoints';
import {
  getBookingDraft,
  getPublicUser,
  setPlaygroundsClientState,
  setPublicUser,
  setPublicUserToken,
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

const validatePhoneRealtime = (raw, t) => {
  const v = String(raw || '');
  const digits = normalizePhoneDigits(v);

  if (!v.trim()) {
    return {
      ok: false,
      soft: true,
      message: t('service.playgrounds.auth.validation.phoneRequired'),
    };
  }

  const hasLetters = /[A-Za-z]/.test(v);
  if (hasLetters) {
    return {
      ok: false,
      soft: false,
      message: t('service.playgrounds.auth.validation.phoneDigits'),
    };
  }

  if (digits.length < 9 || digits.length > 15) {
    return {
      ok: false,
      soft: false,
      message: t('service.playgrounds.auth.validation.phoneLength'),
    };
  }

  return { ok: true };
};

const getErrorMessage = (err, t) => {
  const detail = err?.detail || err?.response?.data?.detail;
  const msg =
    detail ||
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    t('service.playgrounds.common.errors.generic');
  return msg;
};

export function PlaygroundsAuthScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
  const [initializing, setInitializing] = useState(true);

  const [error, setError] = useState('');
  const [loginPhoneHint, setLoginPhoneHint] = useState(null);
  const [registerPhoneHint, setRegisterPhoneHint] = useState(null);
  const [resetPhoneHint, setResetPhoneHint] = useState(null);

  const pageTitle = useMemo(() => {
    if (mode === MODES.REGISTER) return t('service.playgrounds.auth.titles.register');
    return t('service.playgrounds.auth.titles.login');
  }, [mode, t]);

  const pageSubtitle = useMemo(() => {
    if (mode === MODES.REGISTER) return t('service.playgrounds.auth.subtitles.register');
    return t('service.playgrounds.auth.subtitles.login');
  }, [mode, t]);

  const goAfterAuth = useCallback(async () => {
    const draft = await getBookingDraft();
    if (fromBooking === '1' && draft?.venueId) {
      router.replace(`/playgrounds/book/${draft.venueId}`);
    } else {
      router.replace('/playgrounds/explore');
    }
  }, [fromBooking, router]);

  const restoreSession = useCallback(async () => {
    try {
      const existingUser = await getPublicUser();
      if (existingUser?.id) {
        await goAfterAuth();
      }
    } finally {
      setInitializing(false);
    }
  }, [goAfterAuth]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

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
    const res = validatePhoneRealtime(loginPhone, t);
    setLoginPhoneHint(res.ok ? null : res);
  }, [loginPhone, t]);

  useEffect(() => {
    if (!registerPhone) {
      setRegisterPhoneHint(null);
      return;
    }
    const res = validatePhoneRealtime(registerPhone, t);
    setRegisterPhoneHint(res.ok ? null : res);
  }, [registerPhone, t]);

  useEffect(() => {
    if (!resetPhone) {
      setResetPhoneHint(null);
      return;
    }
    const res = validatePhoneRealtime(resetPhone, t);
    setResetPhoneHint(res.ok ? null : res);
  }, [resetPhone, t]);

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
        setError(t('service.playgrounds.auth.validation.loginRequired'));
        return;
      }

      const phoneRes = validatePhoneRealtime(loginPhone, t);
      if (!phoneRes.ok && !phoneRes.soft) {
        setError(phoneRes.message);
        return;
      }

      const res = await endpoints.publicUsers.login({
        phone: loginPhone.trim(),
        password: loginPassword,
        remember_me: rememberMe ? true : false, // harmless if backend ignores
      });

      const authToken =
        res?.access_token ||
        res?.token ||
        res?.data?.access_token ||
        res?.data?.token ||
        null;
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
        setError(t('service.playgrounds.auth.errors.invalidCredentials'));
        return;
      }

      await setPublicUser(user);
      if (authToken) await setPublicUserToken(authToken);
      if (clientState) await setPlaygroundsClientState(clientState);

      await goAfterAuth();
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  }, [goAfterAuth, loginPassword, loginPhone, rememberMe, t]);

  const handleRegister = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (!firstName.trim() || !lastName.trim()) {
        setError(t('service.playgrounds.auth.validation.nameRequired'));
        return;
      }

      if (!registerPhone.trim()) {
        setError(t('service.playgrounds.auth.validation.phoneRequiredRegister'));
        return;
      }

      const phoneRes = validatePhoneRealtime(registerPhone, t);
      if (!phoneRes.ok && !phoneRes.soft) {
        setError(phoneRes.message);
        return;
      }

      if (!registerPassword || registerPassword.length < 6) {
        setError(t('service.playgrounds.auth.validation.passwordLength'));
        return;
      }

      if (registerPassword !== registerConfirmPassword) {
        setError(t('service.playgrounds.auth.validation.passwordMismatch'));
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

      const authToken =
        res?.access_token ||
        res?.token ||
        res?.data?.access_token ||
        res?.data?.token ||
        null;
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
        setError(t('service.playgrounds.auth.errors.registerFailed'));
        return;
      }

      await setPublicUser(user);
      if (authToken) await setPublicUserToken(authToken);
      if (clientState) await setPlaygroundsClientState(clientState);

      await goAfterAuth();
    } catch (err) {
      setError(getErrorMessage(err, t));
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
    t,
  ]);

  const handleResetRequest = useCallback(async () => {
    setResetLoading(true);
    setError('');

    try {
      if (!resetPhone.trim()) {
        setError(t('service.playgrounds.auth.validation.phoneRequiredReset'));
        return;
      }

      const phoneRes = validatePhoneRealtime(resetPhone, t);
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
      setError(getErrorMessage(err, t));
    } finally {
      setResetLoading(false);
    }
  }, [resetPhone, t]);

  const handleResetConfirm = useCallback(async () => {
    setResetLoading(true);
    setError('');

    try {
      if (!resetPhone.trim() || !resetCode.trim() || !resetNewPassword || !resetConfirmPassword) {
        setError(t('service.playgrounds.auth.validation.resetFields'));
        return;
      }

      if (resetNewPassword.length < 6) {
        setError(t('service.playgrounds.auth.validation.passwordLength'));
        return;
      }

      if (resetNewPassword !== resetConfirmPassword) {
        setError(t('service.playgrounds.auth.validation.passwordMismatch'));
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
      setError(getErrorMessage(err, t));
    } finally {
      setResetLoading(false);
    }
  }, [closeReset, resetCode, resetConfirmPassword, resetNewPassword, resetPhone, t]);

  const onPrimaryAction = useCallback(() => {
    if (mode === MODES.LOGIN) return handleLogin();
    return handleRegister();
  }, [handleLogin, handleRegister, mode]);

  return (
    <Screen safe>
      <AppHeader title={t('service.playgrounds.auth.headerTitle')} leftSlot={<BackButton />} />

      {initializing ? (
        <SporHiveLoader message={t('service.playgrounds.auth.loading')} />
      ) : (
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
          <View
            style={[
              styles.card,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <SegmentedControl
              value={mode}
              onChange={onChangeMode}
              options={[
                { value: MODES.LOGIN, label: t('service.playgrounds.auth.tabs.signIn') },
                { value: MODES.REGISTER, label: t('service.playgrounds.auth.tabs.signUp') },
              ]}
            />

            {/* Error (mirror web alert box) */}
            {error ? (
              <View
                style={[
                  styles.errorBox,
                  { borderColor: colors.error, backgroundColor: colors.surfaceElevated },
                ]}
              >
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
                  label={t('service.playgrounds.auth.fields.phone.label')}
                  value={loginPhone}
                  onChangeText={setLoginPhone}
                  placeholder={t('service.playgrounds.auth.fields.phone.placeholder')}
                  keyboardType="phone-pad"
                  accessibilityLabel={t('service.playgrounds.auth.fields.phone.accessibilityLogin')}
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
                    {t('service.playgrounds.auth.hints.phone')}
                  </Text>
                )}

                <Input
                  label={t('service.playgrounds.auth.fields.password.label')}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder={t('service.playgrounds.auth.fields.password.placeholder')}
                  secureTextEntry
                  accessibilityLabel={t('service.playgrounds.auth.fields.password.accessibilityLogin')}
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
                          borderColor: rememberMe ? colors.accentOrange : colors.border,
                          backgroundColor: rememberMe ? colors.accentOrange : colors.surface,
                        },
                      ]}
                    />
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {t('service.playgrounds.auth.actions.rememberMe')}
                    </Text>
                  </Pressable>

                  <Pressable onPress={openReset} hitSlop={10}>
                    <Text variant="bodySmall" color={colors.accentOrange}>
                      {t('service.playgrounds.auth.actions.forgotPassword')}
                    </Text>
                  </Pressable>
                </View>

                {/* Reset panel (inline, 2 steps) */}
                {resetOpen ? (
                  <View
                    style={[
                      styles.resetPanel,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceElevated,
                      },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <Text variant="bodySmall" style={{ fontWeight: '700' }}>
                        {t('service.playgrounds.auth.reset.title')}
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
                          label={t('service.playgrounds.auth.fields.phone.label')}
                          value={resetPhone}
                          onChangeText={setResetPhone}
                          placeholder={t('service.playgrounds.auth.fields.phone.placeholder')}
                          keyboardType="phone-pad"
                          accessibilityLabel={t('service.playgrounds.auth.fields.phone.accessibilityReset')}
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
                          accessibilityLabel={t('service.playgrounds.auth.reset.sendCodeAccessibility')}
                        >
                          {t('service.playgrounds.auth.reset.sendCode')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Input
                          label={t('service.playgrounds.auth.reset.codeLabel')}
                          value={resetCode}
                          onChangeText={setResetCode}
                          placeholder={t('service.playgrounds.auth.reset.codePlaceholder')}
                          keyboardType="number-pad"
                          accessibilityLabel={t('service.playgrounds.auth.reset.codeAccessibility')}
                        />

                        <Input
                          label={t('service.playgrounds.auth.reset.newPasswordLabel')}
                          value={resetNewPassword}
                          onChangeText={setResetNewPassword}
                          placeholder={t('service.playgrounds.auth.reset.newPasswordPlaceholder')}
                          secureTextEntry
                          accessibilityLabel={t('service.playgrounds.auth.reset.newPasswordAccessibility')}
                        />

                        <Input
                          label={t('service.playgrounds.auth.reset.confirmPasswordLabel')}
                          value={resetConfirmPassword}
                          onChangeText={setResetConfirmPassword}
                          placeholder={t('service.playgrounds.auth.reset.confirmPasswordPlaceholder')}
                          secureTextEntry
                          accessibilityLabel={t('service.playgrounds.auth.reset.confirmPasswordAccessibility')}
                        />

                        <Button
                          onPress={handleResetConfirm}
                          loading={resetLoading}
                          accessibilityLabel={t('service.playgrounds.auth.reset.updateAccessibility')}
                        >
                          {t('service.playgrounds.auth.reset.update')}
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
                            {t('service.playgrounds.auth.reset.backToRequest')}
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
                    label={t('service.playgrounds.auth.fields.firstName.label')}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder={t('service.playgrounds.auth.fields.firstName.placeholder')}
                    style={styles.rowInput}
                    accessibilityLabel={t('service.playgrounds.auth.fields.firstName.accessibility')}
                  />
                  <Input
                    label={t('service.playgrounds.auth.fields.lastName.label')}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder={t('service.playgrounds.auth.fields.lastName.placeholder')}
                    style={styles.rowInput}
                    accessibilityLabel={t('service.playgrounds.auth.fields.lastName.accessibility')}
                  />
                </View>

                <Input
                  label={t('service.playgrounds.auth.fields.phone.label')}
                  value={registerPhone}
                  onChangeText={setRegisterPhone}
                  placeholder={t('service.playgrounds.auth.fields.phone.placeholder')}
                  keyboardType="phone-pad"
                  accessibilityLabel={t('service.playgrounds.auth.fields.phone.accessibilityRegister')}
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
                    {t('service.playgrounds.auth.hints.phone')}
                  </Text>
                )}

                <Input
                  label={t('service.playgrounds.auth.fields.email.label')}
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                  placeholder={t('service.playgrounds.auth.fields.email.placeholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accessibilityLabel={t('service.playgrounds.auth.fields.email.accessibility')}
                />

                {/* If you want a gender selector later, you can swap this Input to a Select/Picker component */}
                {/* <Input label="Gender (optional)" value={registerGender} onChangeText={setRegisterGender} /> */}

                <Input
                  label={t('service.playgrounds.auth.fields.password.label')}
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  placeholder={t('service.playgrounds.auth.fields.password.createPlaceholder')}
                  secureTextEntry
                  accessibilityLabel={t('service.playgrounds.auth.fields.password.accessibilityRegister')}
                />

                <Input
                  label={t('service.playgrounds.auth.fields.confirmPassword.label')}
                  value={registerConfirmPassword}
                  onChangeText={setRegisterConfirmPassword}
                  placeholder={t('service.playgrounds.auth.fields.confirmPassword.placeholder')}
                  secureTextEntry
                  accessibilityLabel={t('service.playgrounds.auth.fields.confirmPassword.accessibility')}
                />
              </>
            ) : null}

            <Button
              onPress={onPrimaryAction}
              loading={loading}
              accessibilityLabel={t('service.playgrounds.auth.actions.continueAccessibility')}
            >
              {mode === MODES.LOGIN
                ? t('service.playgrounds.auth.actions.signIn')
                : t('service.playgrounds.auth.actions.createAccount')}
            </Button>

            {/* Footer hint (mirror: resume booking) */}
            <View style={styles.footerHint}>
              <Text variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center' }}>
                {t('service.playgrounds.auth.footerHint')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      )}
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
