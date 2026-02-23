import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useTranslation } from '../../services/i18n/i18n';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { PhoneField } from '../../components/ui/PhoneField';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { useToast } from '../../components/ui/ToastHost';
import { AuthCard } from '../../components/auth/AuthCard';
import { SegmentedToggle } from '../../components/auth/SegmentedToggle';
import { AcademyPicker } from '../../components/auth/AcademyPicker';
import { authApi } from '../../services/auth/auth.api';
import { useAuth } from '../../services/auth/auth.store';
import { resolveAuthErrorMessage } from '../../services/auth/auth.errors';
import { borderRadius, spacing } from '../../theme/tokens';
import {
  DEFAULT_POST_LOGIN_ROUTE,
  sanitizeRedirectTo,
} from '../../utils/navigation/sanitizeRedirectTo';

const logoSource = require('../../../assets/images/logo.png');

const MODES = {
  PUBLIC: 'public',
  PLAYER: 'player',
};

export function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const formContainerWidth =
    width >= 768 ? Math.min(720, Math.floor(width * 0.72)) : '100%';
  const subtitleMaxWidth =
    width >= 768 ? Math.min(640, Math.floor(width * 0.62)) : Math.floor(width * 0.85);

  const {
    loginPublic,
    loginPlayer,
    isLoading,
    lastSelectedAcademyId,
    setLastSelectedAcademyId,
  } = useAuth();

  const preferredAcademyId = params?.academyId ? Number(params.academyId) : null;
  const rawRedirectTo =
    typeof params?.redirectTo === 'string' && params.redirectTo.trim()
      ? params.redirectTo
      : null;
  const safeRedirect = useMemo(
    () => sanitizeRedirectTo(rawRedirectTo),
    [rawRedirectTo]
  );
  const lockMode = params?.lockMode === '1' || params?.lockMode === 'true';

  const [mode, setMode] = useState(params?.mode === 'player' ? MODES.PLAYER : MODES.PUBLIC);

  const [phoneValue, setPhoneValue] = useState({
    countryCode: '+962',
    nationalNumber: '',
    e164: '',
    isValid: false,
  });
  const [password, setPassword] = useState('');

  const [academy, setAcademy] = useState(null);
  const [username, setUsername] = useState('');

  const [academies, setAcademies] = useState([]);
  const [academyLoading, setAcademyLoading] = useState(false);
  const [academyError, setAcademyError] = useState('');
  const [debbug, setDebbug] = useState('');

  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const toggleOptions = useMemo(
    () => [
      { value: MODES.PUBLIC, label: t('auth.mode.public') },
      { value: MODES.PLAYER, label: t('auth.mode.player') },
    ],
    [t]
  );

  const handleModeChange = (next) => {
    if (lockMode) return;
    setMode(next);
    setFormErrors({});
    setPassword('');
    setSubmitError(null);
  };

  useEffect(() => {
    const nextMode = params?.mode === 'player' ? MODES.PLAYER : MODES.PUBLIC;
    setMode(nextMode);
  }, [params?.mode]);

  useEffect(() => {
    if (!rawRedirectTo || safeRedirect) return;
    toast.warning(t('auth.redirectInvalid'));
  }, [rawRedirectTo, safeRedirect, t, toast]);

  const recentAcademies = useMemo(() => {
    if (!lastSelectedAcademyId) return [];
    const match = academies.find((item) => item.id === lastSelectedAcademyId);
    return match ? [match] : [];
  }, [academies, lastSelectedAcademyId]);

  const resolveAcademy = useCallback(
    (list) => {
      const targetId = preferredAcademyId || lastSelectedAcademyId;
      if (!targetId) return;
      const match = list.find((item) => item.id === targetId);
      if (match) setAcademy(match);
    },
    [lastSelectedAcademyId, preferredAcademyId]
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
        setDebbug(JSON.stringify(res.error || {}) + '-' + String(res));
      }
      setAcademyLoading(false);
    };

    loadAcademies();
    return () => {
      mounted = false;
    };
  }, [mode, resolveAcademy, t]);

  const errorMessage = submitError ? resolveAuthErrorMessage(submitError, t) : '';

  const onSelectAcademy = (item) => {
    setAcademy(item);
    setLastSelectedAcademyId(item?.id);
  };

  const handlePhoneChange = (payload) => {
    setPhoneValue(payload);
    setFormErrors((prev) => {
      if (!prev.phone) return prev;
      const { phone, ...rest } = prev;
      return rest;
    });
  };

  const onSubmit = async () => {
    setFormErrors({});
    setSubmitError(null);

    if (mode === MODES.PUBLIC) {
      const nextErrors = {};
      if (!phoneValue?.nationalNumber) nextErrors.phone = t('auth.validation.phoneRequired');
      else if (!phoneValue?.isValid) nextErrors.phone = t('auth.validation.phoneInvalid');
      if (!password) nextErrors.password = t('auth.validation.passwordRequired');

      if (Object.keys(nextErrors).length) {
        setFormErrors(nextErrors);
        return;
      }

      const res = await loginPublic({
        phone: phoneValue.e164,
        password,
      });

      if (res.success) {
        toast.success(t('auth.login.success'));
        router.replace(safeRedirect || DEFAULT_POST_LOGIN_ROUTE);
      } else {
        setSubmitError(res.error);
        toast.error(resolveAuthErrorMessage(res.error, t, 'auth.login.error'));
      }
      return;
    }

    const nextErrors = {};
    if (!academy?.id) nextErrors.academy = t('auth.validation.academyRequired');
    if (!username.trim()) nextErrors.username = t('auth.validation.usernameRequired');
    if (!password) nextErrors.password = t('auth.validation.passwordRequired');

    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      return;
    }

    const res = await loginPlayer({
      academyId: academy.id,
      username: username.trim(),
      password,
    });

    if (res.success) {
      toast.success(t('auth.login.success'));
      router.replace(safeRedirect || DEFAULT_POST_LOGIN_ROUTE);
    } else {
      setSubmitError(res.error);
      toast.error(resolveAuthErrorMessage(res.error, t, 'auth.login.error'));
    }
  };

  return (
    <Screen
      scroll
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.md }]}
      safe
    >
      <LinearGradient
        colors={isDark ? [colors.background, colors.surface] : [colors.surface, colors.background]}
        style={styles.background}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <View style={[styles.header, { width: formContainerWidth }]}>
            <View style={[styles.logoWrap, { backgroundColor: colors.accentOrange + '15' }]}>
              <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            </View>
            <Text variant="h1" weight="bold" style={styles.title}>
              {t('auth.login.title')}
            </Text>
            <Text
              variant="bodyLarge"
              color={colors.textSecondary}
              style={[styles.subtitle, { maxWidth: subtitleMaxWidth }]}
            >
              {t('auth.login.subtitle')}
            </Text>
          </View>

          <AuthCard style={[styles.card, { width: formContainerWidth }]}>
            {/* ✅ prevents SegmentedToggle overflow & keeps it inside card */}
            {lockMode ? (
              <View
                style={[
                  styles.lockedModeWrap,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Text variant="caption" color={colors.textSecondary} style={styles.lockedModeText}>
                  {t('entry.lockedHint', {
                    mode: mode === MODES.PLAYER ? t('entry.player.title') : t('entry.public.title'),
                  })}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/entry')} style={styles.linkButton}>
                  <Text variant="caption" weight="bold" color={colors.accentOrange}>
                    {t('entry.changePath')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.toggleWrap,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <SegmentedToggle
                  value={mode}
                  onChange={handleModeChange}
                  options={toggleOptions}
                  style={styles.toggle}
                />
              </View>
            )}

            <View style={styles.formContainer}>
              {mode === MODES.PUBLIC ? (
                <View style={styles.form}>
                  <PhoneField
                    label={t('auth.fields.phone')}
                    value={phoneValue}
                    onChange={handlePhoneChange}
                    error={formErrors.phone}
                  />

                  <Input
                    label={t('auth.fields.password')}
                    placeholder={t('auth.placeholders.password')}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    leftIcon="lock"
                    error={formErrors.password}
                  />

                  {submitError ? (
                    <View
                      style={[
                        styles.errorBanner,
                        {
                          backgroundColor: colors.error + '12',
                          borderColor: colors.error + '30',
                        },
                      ]}
                    >
                      <Text
                        variant="body"
                        color={colors.error}
                        style={isRTL ? styles.textRTL : styles.textLTR}
                      >
                        {errorMessage}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.linkRow, isRTL ? styles.rowRTL : styles.rowLTR]}>
                    <TouchableOpacity
                      onPress={() => router.push(`/(auth)/reset-password?mode=${mode}`)}
                      style={styles.linkButton}
                    >
                      <Text variant="body" color={colors.accentOrange} weight="medium">
                        {t('auth.login.forgotPassword')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.linkRow, isRTL ? styles.rowRTL : styles.rowLTR]}>
                    <Text variant="body" color={colors.textSecondary}>
                      {t('auth.login.noAccount')}
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                      <Text
                        variant="body"
                        weight="bold"
                        color={colors.accentOrange}
                        style={[styles.signupLink, isRTL ? styles.mrXs : styles.mlXs]}
                      >
                        {t('auth.login.createAccount')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.form}>
                  <AcademyPicker
                    academies={academies}
                    selectedAcademy={academy}
                    recentAcademies={recentAcademies}
                    onSelect={onSelectAcademy}
                    loading={academyLoading}
                    error={academyError}
                    debbug={debbug}
                    title={t('auth.fields.academy')}
                    helper={t('auth.academy.helper')}
                    searchPlaceholder={t('auth.academy.searchPlaceholder')}
                    doneLabel={t('common.done')}
                    loadingLabel={t('common.loading')}
                  />

                  {formErrors.academy ? (
                    <Text
                      variant="caption"
                      color={colors.error}
                      style={[styles.fieldError, isRTL ? styles.textRTL : styles.textLTR]}
                    >
                      {formErrors.academy}
                    </Text>
                  ) : null}

                  <Input
                    label={t('auth.fields.username')}
                    placeholder={t('auth.placeholders.username')}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    leftIcon="user"
                    error={formErrors.username}
                  />

                  <Input
                    label={t('auth.fields.password')}
                    placeholder={t('auth.placeholders.password')}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    leftIcon="lock"
                    error={formErrors.password}
                  />

                  {submitError ? (
                    <View
                      style={[
                        styles.errorBanner,
                        {
                          backgroundColor: colors.error + '12',
                          borderColor: colors.error + '30',
                        },
                      ]}
                    >
                      <Text
                        variant="body"
                        color={colors.error}
                        style={isRTL ? styles.textRTL : styles.textLTR}
                      >
                        {errorMessage}
                      </Text>
                    </View>
                  ) : null}

                  <View style={[styles.linkRow, isRTL ? styles.rowRTL : styles.rowLTR]}>
                    <TouchableOpacity
                      onPress={() => router.push(`/(auth)/reset-password?mode=${mode}`)}
                      style={styles.linkButton}
                    >
                      <Text variant="body" color={colors.accentOrange} weight="medium">
                        {t('auth.login.forgotPassword')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.ctaContainer}>
              <Button
                onPress={onSubmit}
                loading={isLoading}
                disabled={
                  mode === MODES.PUBLIC
                    ? !phoneValue?.nationalNumber || !password
                    : !academy?.id || !username || !password
                }
                style={styles.cta}
                textStyle={styles.ctaText}
                accessibilityLabel={mode === MODES.PUBLIC ? t('auth.login.cta') : t('auth.login.ctaPlayer')}
              >
                {mode === MODES.PUBLIC ? t('auth.login.cta') : t('auth.login.ctaPlayer')}
              </Button>
            </View>
          </AuthCard>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  background: { flex: 1 },

  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },

  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logo: { width: 56, height: 56 },

  title: { textAlign: 'center', marginBottom: spacing.xs },
  subtitle: {
    textAlign: 'center',
    lineHeight: 24,
  },

  card: {
    width: '100%',
    padding: spacing.lg,
    alignSelf: 'center',
  },

  /* ✅ Toggle: clipped + no overflow */
  toggleWrap: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
    padding: 2,
    marginBottom: spacing.lg,
    alignSelf: 'stretch',
  },
  toggle: {
    alignSelf: 'stretch',
  },
  lockedModeWrap: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  lockedModeText: {
    flex: 1,
  },

  formContainer: {
    marginBottom: spacing.lg,
    width: '100%',
    alignSelf: 'stretch',
  },

  form: {
    gap: spacing.md,
    width: '100%',
    alignItems: 'stretch',
  },
  linkRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },

  errorBanner: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },

  forgotLink: {
    marginTop: spacing.xs,
  },

  signupContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  signupLink: {},

  ctaContainer: {
    marginTop: spacing.md,
  },
  cta: {
    borderRadius: borderRadius.pill,
    height: 56,
  },
  ctaText: { fontSize: 18 },

  fieldError: {
    marginTop: -spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  // RTL/LTR helpers
  rowLTR: { flexDirection: 'row' },
  rowRTL: { flexDirection: 'row-reverse' },
  textLTR: { textAlign: 'left' },
  textRTL: { textAlign: 'right' },
  alignRight: { alignSelf: 'flex-end' },
  alignLeft: { alignSelf: 'flex-start' },
  mlXs: { marginLeft: spacing.xs },
  mrXs: { marginRight: spacing.xs },
});
