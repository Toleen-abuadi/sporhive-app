import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { authApi } from '../../services/auth/auth.api';
import { useAuth } from '../../services/auth/auth.store';
import { resolveAuthErrorMessage } from '../../services/auth/auth.errors';
import { borderRadius, spacing } from '../../theme/tokens';

const logoSource = require('../../../assets/images/logo.png');

const MODES = {
  PUBLIC: 'public',
  PLAYER: 'player',
};

const normalizePhone = (value) => String(value || '').trim();
const isValidPhone = (value) => {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits.length >= 9 && digits.length <= 15;
};

export function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const { login, isLoading, error, lastSelectedAcademyId, setLastSelectedAcademyId } = useAuth();

  const glow = useRef(new Animated.Value(0)).current;

  const preferredAcademyId = params?.academyId ? Number(params.academyId) : null;
  const [mode, setMode] = useState(params?.mode === 'player' ? MODES.PLAYER : MODES.PUBLIC);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [academy, setAcademy] = useState(null);
  const [username, setUsername] = useState('');
  const [academies, setAcademies] = useState([]);
  const [academyLoading, setAcademyLoading] = useState(false);
  const [academyError, setAcademyError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const toggleOptions = useMemo(
    () => [
      { value: MODES.PUBLIC, label: t('auth.mode.public') },
      { value: MODES.PLAYER, label: t('auth.mode.player') },
    ],
    [t]
  );

  const handleModeChange = (next) => {
    setMode(next);
    setFormErrors({});
    setPassword('');
  };

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
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, [glow]);

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

  const errorMessage = error ? resolveAuthErrorMessage(error, t) : '';

  const onSubmit = async () => {
    setFormErrors({});

    if (mode === MODES.PUBLIC) {
      const nextErrors = {};
      if (!phone.trim()) nextErrors.phone = t('auth.validation.phoneRequired');
      else if (!isValidPhone(phone)) nextErrors.phone = t('auth.validation.phoneInvalid');
      if (!password) nextErrors.password = t('auth.validation.passwordRequired');
      if (Object.keys(nextErrors).length) {
        setFormErrors(nextErrors);
        return;
      }
      const res = await login({
        phone: normalizePhone(phone),
        password,
        login_as: 'public',
      });
      if (res.success) {
        toast.success(t('auth.login.success'));
        router.replace('/services');
      } else {
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

    const res = await login({
      login_as: 'player',
      academy_id: academy.id,
      username: username.trim(),
      password,
    });
    if (res.success) {
      toast.success(t('auth.login.success'));
      router.replace('/services');
    } else {
      toast.error(resolveAuthErrorMessage(res.error, t, 'auth.login.error'));
    }
  };

  const glowStyle = {
    opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] }),
    transform: [
      {
        scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }),
      },
    ],
  };

  const onSelectAcademy = (item) => {
    setAcademy(item);
    setLastSelectedAcademyId(item?.id);
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
              <Animated.View
                style={[
                  styles.logoGlow,
                  {
                    backgroundColor: colors.accentOrange,
                  },
                  glowStyle,
                ]}
              />
              <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            </View>
            <Text variant="h2" weight="bold" style={styles.title}>
              {t('auth.login.title')}
            </Text>
            <Text
              variant="body"
              color={colors.textSecondary}
              style={[styles.subtitle, { textAlign: 'center' }]}
            >
              {t('auth.login.subtitle')}
            </Text>
          </View>

          <AuthCard style={styles.card}>
            <SegmentedToggle value={mode} onChange={handleModeChange} options={toggleOptions} />

            {mode === MODES.PUBLIC ? (
              <View style={styles.form}>
                <Input
                  label={t('auth.fields.phone')}
                  placeholder={t('auth.placeholders.phone')}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  leftIcon="phone"
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
                {error ? (
                  <View style={[styles.errorBanner, { backgroundColor: colors.error + '12' }]}>
                    <Text variant="bodySmall" color={colors.error}>
                      {errorMessage}
                    </Text>
                  </View>
                ) : null}
                <Pressable onPress={() => router.replace('/(auth)/reset-password?mode=public')}>
                  <Text
                    variant="bodySmall"
                    color={colors.textSecondary}
                    style={[styles.linkAlign, { textAlign: isRTL ? 'left' : 'right' }]}
                  >
                    {t('auth.login.forgotPassword')}
                  </Text>
                </Pressable>
                <Button
                  onPress={onSubmit}
                  loading={isLoading}
                  disabled={!phone || !password}
                  style={styles.cta}
                >
                  {t('auth.login.cta')}
                </Button>
                <Pressable onPress={() => router.replace('/(auth)/signup')}>
                  <Text
                    variant="bodySmall"
                    color={colors.textSecondary}
                    style={[styles.linkAlign, { textAlign: isRTL ? 'left' : 'right' }]}
                  >
                    {t('auth.login.noAccount')}{' '}
                    <Text variant="bodySmall" weight="bold" color={colors.accentOrange}>
                      {t('auth.login.createAccount')}
                    </Text>
                  </Text>
                </Pressable>
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
                  title={t('auth.fields.academy')}
                  helper={t('auth.academy.helper')}
                  searchPlaceholder={t('auth.academy.searchPlaceholder')}
                  doneLabel={t('common.done')}
                  loadingLabel={t('common.loading')}
                />
                {formErrors.academy ? (
                  <Text variant="caption" color={colors.error}>
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
                {error ? (
                  <View style={[styles.errorBanner, { backgroundColor: colors.error + '12' }]}>
                    <Text variant="bodySmall" color={colors.error}>
                      {errorMessage}
                    </Text>
                  </View>
                ) : null}
                <Pressable onPress={() => router.replace('/(auth)/reset-password?mode=player')}>
                  <Text
                    variant="bodySmall"
                    color={colors.textSecondary}
                    style={[styles.linkAlign, { textAlign: isRTL ? 'left' : 'right' }]}
                  >
                    {t('auth.login.forgotPassword')}
                  </Text>
                </Pressable>
                <Button
                  onPress={onSubmit}
                  loading={isLoading}
                  disabled={!academy?.id || !username || !password}
                  style={styles.cta}
                >
                  {t('auth.login.ctaPlayer')}
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
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'visible',
  },
  logoGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  logo: {
    width: 48,
    height: 48,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 280,
  },
  card: {
    marginTop: spacing.md,
  },
  form: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  linkAlign: {
    textAlign: 'right',
  },
  cta: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  errorBanner: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
});
