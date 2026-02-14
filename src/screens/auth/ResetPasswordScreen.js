import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { useTranslation } from '../../services/i18n/i18n';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { useToast } from '../../components/ui/ToastHost';
import { AuthCard } from '../../components/auth/AuthCard';
import { SegmentedToggle } from '../../components/auth/SegmentedToggle';
import { AcademyPicker } from '../../components/auth/AcademyPicker';
import { OTPInput } from '../../components/auth/OTPInput';
import { authApi } from '../../services/auth/auth.api';
import { resolveAuthErrorMessage } from '../../services/auth/auth.errors';
import { useAuth } from '../../services/auth/auth.store';
import { borderRadius, spacing } from '../../theme/tokens';

const STEPS = {
  IDENTIFY: 1,
  OTP: 2,
  FINAL: 3,
};

const MODES = {
  PUBLIC: 'public',
  PLAYER: 'player',
};

const normalizePhone = (value) => String(value || '').trim();
const isValidPhone = (value) => {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits.length >= 9 && digits.length <= 15;
};

export function ResetPasswordScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams();
  const { lastSelectedAcademyId, setLastSelectedAcademyId } = useAuth();

  const [step, setStep] = useState(STEPS.IDENTIFY);
  const [mode, setMode] = useState(params?.mode === 'player' ? MODES.PLAYER : MODES.PUBLIC);
  const [phone, setPhone] = useState('');
  const [academy, setAcademy] = useState(null);
  const [username, setUsername] = useState('');
  const [academies, setAcademies] = useState([]);
  const [academyLoading, setAcademyLoading] = useState(false);
  const [academyError, setAcademyError] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [revealGenerated, setRevealGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [resendIn, setResendIn] = useState(0);
  const [complete, setComplete] = useState(false);

  const toggleOptions = useMemo(
    () => [
      { value: MODES.PUBLIC, label: t('auth.mode.public') },
      { value: MODES.PLAYER, label: t('auth.mode.player') },
    ],
    [t]
  );

  const handleModeChange = (next) => {
    setMode(next);
    setErrors({});
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setComplete(false);
  };

  const recentAcademies = useMemo(() => {
    if (!lastSelectedAcademyId) return [];
    const match = academies.find((item) => item.id === lastSelectedAcademyId);
    return match ? [match] : [];
  }, [academies, lastSelectedAcademyId]);

  const resolveAcademy = useCallback(
    (list) => {
      if (!lastSelectedAcademyId) return;
      const match = list.find((item) => item.id === lastSelectedAcademyId);
      if (match) setAcademy(match);
    },
    [lastSelectedAcademyId]
  );

  useEffect(() => {
    let mounted = true;
    if (mode !== MODES.PLAYER) return undefined;
    const loadAcademies = async () => {
      setAcademyLoading(true);
      setAcademyError('');
      const res = await authApi.fetchAcademies();
      if (!mounted) return;
      if (res.success) {
        setAcademies(res.data);
        resolveAcademy(res.data);
      } else {
        setAcademyError(t('auth.academy.error'));
      }
      setAcademyLoading(false);
    };
    loadAcademies();
    return () => {
      mounted = false;
    };
  }, [mode, resolveAcademy, t]);

  useEffect(() => {
    if (!resendIn) return undefined;
    const timer = setInterval(() => {
      setResendIn((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const startResendTimer = () => {
    setResendIn(45);
  };

  const requestOtp = useCallback(async () => {
    setComplete(false);
    setGeneratedPassword('');
    setRevealGenerated(false);
    const nextErrors = {};
    if (mode === MODES.PUBLIC) {
      if (!phone.trim()) nextErrors.phone = t('auth.validation.phoneRequired');
      else if (!isValidPhone(phone)) nextErrors.phone = t('auth.validation.phoneInvalid');
    } else {
      if (!academy?.id) nextErrors.academy = t('auth.validation.academyRequired');
      if (!username.trim()) nextErrors.username = t('auth.validation.usernameRequired');
      if (!phone.trim()) nextErrors.phone = t('auth.validation.phoneRequired');
      else if (!isValidPhone(phone)) nextErrors.phone = t('auth.validation.phoneInvalid');
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const payload =
      mode === MODES.PUBLIC
        ? {
          user_kind: 'public',
          phone: normalizePhone(phone),
        }
        : {
          user_kind: 'player',
          academy_id: Number(academy?.id),
          username: username.trim(),
          phone_number: normalizePhone(phone),
        };
    const res = await authApi.passwordResetRequest(payload);
    setLoading(false);
    if (res.success) {
      setStep(STEPS.OTP);
      setOtp('');
      startResendTimer();
      toast.success(t('auth.reset.requestSuccess'));
      if (academy?.id) setLastSelectedAcademyId(academy.id);
      return;
    }
    toast.error(resolveAuthErrorMessage(res?.error, t, 'auth.reset.requestError'));
  }, [academy, mode, phone, setLastSelectedAcademyId, t, username, toast]);

  const confirmOtp = async () => {
    if (otp.length !== 6) {
      setErrors({ otp: t("auth.validation.otpLength") });
      return;
    }

    setErrors({});
    setLoading(true);

    if (mode === MODES.PUBLIC) {
      const res = await authApi.passwordResetVerify({
        user_kind: "public",
        phone: normalizePhone(phone),
        otp,
      });

      setLoading(false);

      if (!res.success) {
        toast.error(t("auth.reset.invalidOtp"));
        return;
      }

      toast.success(t("auth.reset.otpVerified"));
      setStep(STEPS.FINAL);
      return;
    }

    setLoading(true);
    const res = await authApi.passwordResetConfirm({
      user_kind: 'player',
      academy_id: Number(academy?.id),
      username: username.trim(),
      otp,
    });
    setLoading(false);
    if (res.success) {
      setGeneratedPassword(res?.data?.generated_password || '');
      setStep(STEPS.FINAL);
      toast.success(t('auth.reset.playerSuccess'));
      return;
    }
    toast.error(resolveAuthErrorMessage(res?.error, t, 'auth.reset.confirmError'));
  };

  const resetPassword = async () => {
    const nextErrors = {};
    if (!newPassword) nextErrors.newPassword = t('auth.validation.passwordRequired');
    if (newPassword.length < 8) nextErrors.newPassword = t('auth.validation.passwordLength');
    if (newPassword !== confirmPassword) nextErrors.confirmPassword = t('auth.validation.passwordMismatch');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const res = await authApi.passwordResetConfirm({
      user_kind: 'public',
      phone: normalizePhone(phone),
      otp,
      new_password: newPassword,
    });
    setLoading(false);
    if (res.success) {
      setComplete(true);
      toast.success(t('auth.reset.publicSuccess'));
      return;
    }
    toast.error(resolveAuthErrorMessage(res?.error, t, 'auth.reset.confirmError'));
  };

  const copyGenerated = async () => {
    if (!generatedPassword) return;
    try {
      const clipboard = Platform.OS === 'web' ? global?.navigator?.clipboard : null;
      if (clipboard?.writeText) {
        await clipboard.writeText(generatedPassword);
        toast.success(t('auth.reset.copied'));
        return;
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Clipboard copy failed', error);
      }
    }
    toast.warning(t('auth.reset.copyUnsupported'));
  };

  const maskedGenerated = revealGenerated
    ? generatedPassword
    : generatedPassword
      .split('')
      .map((char, idx) => (idx < 2 ? char : '•'))
      .join('');

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
            <Pressable onPress={() => router.back()} style={styles.backRow}>
              <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={20} color={colors.textPrimary} />
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('auth.reset.back')}
              </Text>
            </Pressable>
            <Text variant="h2" weight="bold">
              {t('auth.reset.title')}
            </Text>
            <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
              {t('auth.reset.subtitle')}
            </Text>
          </View>

          <AuthCard>
            <View style={styles.stepper}>
              {[1, 2, 3].map((num) => {
                const active = step >= num;
                return (
                  <View key={`step-${num}`} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: active ? colors.accentOrange : colors.border,
                        },
                      ]}
                    />
                    {num < 3 ? (
                      <View
                        style={[
                          styles.stepLine,
                          { backgroundColor: step > num ? colors.accentOrange : colors.border },
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>

            {step === STEPS.IDENTIFY && (
              <View style={styles.form}>
                <SegmentedToggle value={mode} onChange={handleModeChange} options={toggleOptions} />
                {mode === MODES.PLAYER ? (
                  <>
                    <AcademyPicker
                      academies={academies}
                      selectedAcademy={academy}
                      recentAcademies={recentAcademies}
                      onSelect={(item) => {
                        setAcademy(item);
                        setLastSelectedAcademyId(item?.id);
                      }}
                      loading={academyLoading}
                      error={academyError}
                      title={t('auth.fields.academy')}
                      helper={t('auth.academy.helper')}
                      searchPlaceholder={t('auth.academy.searchPlaceholder')}
                      doneLabel={t('common.done')}
                      loadingLabel={t('common.loading')}
                    />
                    {errors.academy ? (
                      <Text variant="caption" color={colors.error}>
                        {errors.academy}
                      </Text>
                    ) : null}
                    <Input
                      label={t('auth.fields.username')}
                      placeholder={t('auth.placeholders.username')}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      leftIcon="user"
                      error={errors.username}
                    />
                  </>
                ) : null}
                <Input
                  label={t('auth.fields.phone')}
                  placeholder={t('auth.placeholders.phone')}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  leftIcon="phone"
                  error={errors.phone}
                />
                <Button onPress={requestOtp} loading={loading} style={styles.cta}>
                  {t('auth.reset.sendCode')}
                </Button>
              </View>
            )}

            {step === STEPS.OTP && (
              <View style={styles.form}>
                <Text variant="bodySmall" color={colors.textSecondary} style={styles.centered}>
                  {t('auth.reset.otpHint')}
                </Text>
                <OTPInput value={otp} onChange={setOtp} error={errors.otp} />
                <View style={styles.resendRow}>
                  <Text variant="caption" color={colors.textSecondary}>
                    {resendIn > 0
                      ? t('auth.reset.resendCountdown', { seconds: resendIn })
                      : t('auth.reset.resendReady')}
                  </Text>
                  <Pressable
                    onPress={() => resendIn === 0 && requestOtp()}
                    disabled={resendIn > 0}
                  >
                    <Text
                      variant="caption"
                      weight="bold"
                      color={resendIn > 0 ? colors.textMuted : colors.accentOrange}
                    >
                      {t('auth.reset.resend')}
                    </Text>
                  </Pressable>
                </View>
                <Button onPress={confirmOtp} loading={loading} style={styles.cta}>
                  {t('auth.reset.verify')}
                </Button>
              </View>
            )}

            {step === STEPS.FINAL && mode === MODES.PUBLIC && !complete && (
              <View style={styles.form}>
                <Input
                  label={t('auth.fields.newPassword')}
                  placeholder={t('auth.placeholders.password')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  leftIcon="lock"
                  error={errors.newPassword}
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
                <Button onPress={resetPassword} loading={loading} style={styles.cta}>
                  {t('auth.reset.updatePassword')}
                </Button>
              </View>
            )}

            {((step === STEPS.FINAL && mode === MODES.PLAYER) || complete) && (
              <View style={styles.finalCard}>
                <View style={[styles.finalIcon, { backgroundColor: colors.success + '1A' }]}>
                  <Feather name="check" size={28} color={colors.success} />
                </View>
                <Text variant="h3" weight="bold" style={styles.centered}>
                  {mode === MODES.PLAYER
                    ? t('auth.reset.playerFinalTitle')
                    : t('auth.reset.publicFinalTitle')}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={styles.centered}>
                  {mode === MODES.PLAYER
                    ? t('auth.reset.playerFinalSubtitle')
                    : t('auth.reset.publicFinalSubtitle')}
                </Text>
                {mode === MODES.PLAYER ? (
                  <View style={[styles.passwordCard, { borderColor: colors.border }]}>
                    <Text variant="caption" color={colors.textMuted}>
                      {t('auth.reset.generatedPassword')}
                    </Text>
                    <Text variant="h4" weight="bold" style={styles.centered}>
                      {maskedGenerated || t('auth.reset.generatedFallback')}
                    </Text>
                    <View style={styles.passwordActions}>
                      <Pressable onPress={() => setRevealGenerated((prev) => !prev)} style={styles.actionButton}>
                        <Feather name={revealGenerated ? 'eye-off' : 'eye'} size={16} color={colors.textSecondary} />
                        <Text variant="caption" color={colors.textSecondary}>
                          {revealGenerated ? t('auth.reset.hide') : t('auth.reset.reveal')}
                        </Text>
                      </Pressable>
                      <Pressable onPress={copyGenerated} style={styles.actionButton}>
                        <Feather name="copy" size={16} color={colors.textSecondary} />
                        <Text variant="caption" color={colors.textSecondary}>
                          {t('auth.reset.copy')}
                        </Text>
                      </Pressable>
                    </View>
                    <Text variant="caption" color={colors.textSecondary} style={styles.centered}>
                      {t('auth.reset.saveHint')}
                    </Text>
                  </View>
                ) : null}
                <Button
                  onPress={() => {
                    const targetAcademy = academy?.id ? `&academyId=${academy.id}` : '';
                    router.replace(`/(auth)/login?mode=${mode}${targetAcademy}`);
                  }}
                  style={styles.cta}
                >
                  {t('auth.reset.backToLogin')}
                </Button>
              </View>
            )}
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
  backRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: spacing.xs,
  },
  form: {
    gap: spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cta: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  finalCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  finalIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '100%',
    gap: spacing.sm,
  },
  passwordActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
