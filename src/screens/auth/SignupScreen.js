import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { useTranslation } from '../../services/i18n/i18n';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { useToast } from '../../components/ui/ToastHost';
import { AuthCard } from '../../components/auth/AuthCard';
import { authApi } from '../../services/auth/auth.api';
import { resolveAuthErrorMessage } from '../../services/auth/auth.errors';
import { borderRadius, spacing } from '../../theme/tokens';

const logoSource = require('../../../assets/images/logo.png');

const normalizePhone = (value) => String(value || '').trim();
const isValidPhone = (value) => {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits.length >= 9 && digits.length <= 15;
};

const MIN_PASSWORD = 8;

export function SignupScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const passwordHints = useMemo(
    () => [
      {
        label: t('auth.signup.passwordHints.length', { count: MIN_PASSWORD }),
        met: password.length >= MIN_PASSWORD,
      },
      {
        label: t('auth.signup.passwordHints.match'),
        met: password && confirmPassword && password === confirmPassword,
      },
    ],
    [confirmPassword, password, t]
  );

  const formValid =
    firstName.trim() &&
    lastName.trim() &&
    isValidPhone(phone) &&
    password.length >= MIN_PASSWORD &&
    password === confirmPassword;

  const onSubmit = async () => {
    const nextErrors = {};
    if (!firstName.trim()) nextErrors.firstName = t('auth.validation.firstNameRequired');
    if (!lastName.trim()) nextErrors.lastName = t('auth.validation.lastNameRequired');
    if (!phone.trim()) nextErrors.phone = t('auth.validation.phoneRequired');
    else if (!isValidPhone(phone)) nextErrors.phone = t('auth.validation.phoneInvalid');
    if (!password) nextErrors.password = t('auth.validation.passwordRequired');
    else if (password.length < MIN_PASSWORD) nextErrors.password = t('auth.validation.passwordLength');
    if (password !== confirmPassword) nextErrors.confirmPassword = t('auth.validation.passwordMismatch');

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const res = await authApi.registerPublic({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: normalizePhone(phone),
      password,
    });
    setLoading(false);

    if (res.success) {
      toast.success(t('auth.signup.success'));
      router.replace('/(auth)/login');
      return;
    }
    toast.error(resolveAuthErrorMessage(res?.error, t, 'auth.signup.error'));
  };

  return (
    <Screen scroll contentContainerStyle={styles.scroll} safe>
      <LinearGradient
        colors={isDark ? [colors.background, colors.surface] : [colors.surface, colors.background]}
        style={styles.background}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <View style={styles.header}>
            <View style={[styles.logoWrap, { backgroundColor: colors.accentOrange + '15' }]}>
              <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            </View>
            <Text variant="h2" weight="bold" style={styles.title}>
              {t('auth.signup.title')}
            </Text>
            <Text
              variant="body"
              color={colors.textSecondary}
              style={[styles.subtitle, { textAlign: 'center' }]}
            >
              {t('auth.signup.subtitle')}
            </Text>
          </View>

          <AuthCard style={styles.card}>
            <View style={styles.row}>
              <Input
                label={t('auth.fields.firstName')}
                placeholder={t('auth.placeholders.firstName')}
                value={firstName}
                onChangeText={setFirstName}
                leftIcon="user"
                error={errors.firstName}
                style={styles.half}
              />
              <Input
                label={t('auth.fields.lastName')}
                placeholder={t('auth.placeholders.lastName')}
                value={lastName}
                onChangeText={setLastName}
                leftIcon="user"
                error={errors.lastName}
                style={styles.half}
              />
            </View>
            <Input
              label={t('auth.fields.phone')}
              placeholder={t('auth.placeholders.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon="phone"
              error={errors.phone}
            />
            <Input
              label={t('auth.fields.password')}
              placeholder={t('auth.placeholders.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon="lock"
              error={errors.password}
            />
            <Input
              label={t('auth.fields.confirmPassword')}
              placeholder={t('auth.placeholders.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon="lock"
              error={errors.confirmPassword}
            />
            <View style={styles.hints}>
              {passwordHints.map((hint) => (
                <View key={hint.label} style={styles.hintRow}>
                  <View
                    style={[
                      styles.hintDot,
                      { backgroundColor: hint.met ? colors.success : colors.border },
                    ]}
                  />
                  <Text variant="caption" color={colors.textSecondary}>
                    {hint.label}
                  </Text>
                </View>
              ))}
            </View>
            <Button
              onPress={onSubmit}
              loading={loading}
              disabled={!formValid}
              style={styles.cta}
            >
              {t('auth.signup.cta')}
            </Button>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text variant="bodySmall" color={colors.textSecondary} style={[styles.linkAlign, { textAlign: isRTL ? 'left' : 'right' }]}>
                {t('auth.signup.haveAccount')}{' '}
                <Text variant="bodySmall" weight="bold" color={colors.accentOrange}>
                  {t('auth.signup.login')}
                </Text>
              </Text>
            </Pressable>
          </AuthCard>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logo: {
    width: 48,
    height: 48,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 300,
  },
  card: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  hints: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cta: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.pill,
  },
  linkAlign: {
    marginTop: spacing.sm,
  },
});
