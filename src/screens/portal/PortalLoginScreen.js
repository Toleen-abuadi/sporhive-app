import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { AcademyPicker } from '../../components/portal/AcademyPicker';
import { portalApi } from '../../services/portal/portal.api';
import { usePortalAuth } from '../../services/portal/portal.hooks';
import { storage } from '../../services/storage/storage';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

export function PortalLoginScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { login, isLoading, error } = usePortalAuth();

  const [academy, setAcademy] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [academies, setAcademies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [academyError, setAcademyError] = useState('');
  const [academyLoading, setAcademyLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fade = useSharedValue(1);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: 0.98 + fade.value * 0.02 }],
  }));

  useEffect(() => {
    let isMounted = true;
    const loadAcademies = async () => {
      setAcademyLoading(true);
      setAcademyError('');
      const res = await portalApi.fetchActiveAcademies();
      if (!isMounted) return;
      if (res?.success) {
        const raw = res.data || {};
        const customers = Array.isArray(raw.customers)
          ? raw.customers
          : Array.isArray(raw?.data?.customers)
            ? raw.data.customers
            : [];
        const items = customers.map((c) => ({
          id: Number(c.id),
          name: c.academy_name || c.label || t('service.portal.login.academyFallback'),
          subtitle: c.client_name || '',
          label: c.label || '',
        }));
        setAcademies(items);
      } else {
        setAcademyError(res?.error?.message || t('service.portal.login.academiesError'));
      }
      setAcademyLoading(false);
    };

    loadAcademies();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadCredentials = async () => {
      if (!storage.getPortalCredentials) return;
      const credentials = await storage.getPortalCredentials();
      if (!isMounted) return;
      if (credentials?.username) setUsername(credentials.username);
      if (credentials?.password) setPassword(credentials.password);
    };
    loadCredentials();
    return () => {
      isMounted = false;
    };
  }, []);

  const subtitle = useMemo(() => {
    if (academy?.name) return t('service.portal.login.subtitleWithAcademy', { academy: academy.name });
    return t('service.portal.login.subtitle');
  }, [academy, t]);

  const onSubmit = async () => {
    setFormError('');
    if (!academy?.id) {
      setFormError(t('service.portal.login.errors.selectAcademy'));
      return;
    }
    if (!username.trim() || !password) {
      setFormError(t('service.portal.login.errors.enterCredentials'));
      return;
    }

    const result = await login({ academyId: academy.id, username, password });
    if (result?.success) {
      setIsSuccess(true);
      fade.value = withTiming(0, { duration: 260 }, (finished) => {
        if (finished) runOnJS(router.replace)('/portal/(tabs)/home');
      });
    } else {
      setFormError(result?.error || error || t('service.portal.login.errors.loginFailed'));
    }
  };

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.background}
      >
        <PortalHeader title={t('service.portal.login.title')} subtitle={subtitle} />

        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={fadeStyle}>
          <PortalCard style={styles.card}>
            <View style={styles.formRow}>
              <Input
                label={t('service.portal.login.username')}
                placeholder={t('service.portal.login.usernamePlaceholder')}
                value={username}
                onChangeText={setUsername}
                leftIcon="user"
                autoCapitalize="none"
              />
              <Input
                label={t('service.portal.login.password')}
                placeholder={t('service.portal.login.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                leftIcon="lock"
                secureTextEntry
              />
              {formError || error ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.error + '22' }]}>
                  <Text variant="bodySmall" color={colors.error}>
                    {formError || error}
                  </Text>
                </View>
              ) : null}
              {isSuccess ? (
                <View style={[styles.successBanner, { backgroundColor: colors.success + '1F' }]}>
                  <Text variant="bodySmall" color={colors.success}>
                    {t('service.portal.login.success')}
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity onPress={() => router.push('/portal/reset-password')}>
                <Text variant="bodySmall" color={colors.textSecondary} style={styles.forgot}>
                  {t('service.portal.login.forgotPassword')}
                </Text>
              </TouchableOpacity>
              <Button
                onPress={onSubmit}
                loading={isLoading}
                disabled={!academy?.id || !username || !password}
                style={styles.button}
              >
                {t('service.portal.login.submit')}
              </Button>
            </View>
          </PortalCard>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.pickerSection}>
          <PortalCard>
            <AcademyPicker
              academies={academies}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelect={setAcademy}
              selectedAcademy={academy}
              loading={academyLoading}
              error={academyError}
            />
          </PortalCard>
        </Animated.View>
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  rtl: {
    direction: 'rtl',
  },
  background: {
    flex: 1,
  },
  card: {
    marginBottom: spacing.lg,
  },
  formRow: {
    gap: spacing.md,
  },
  button: {
    marginTop: spacing.sm,
  },
  forgot: {
    alignSelf: 'flex-end',
  },
  pickerSection: {
    marginTop: spacing.sm,
  },
  errorBanner: {
    borderRadius: 12,
    padding: spacing.sm,
  },
  successBanner: {
    borderRadius: 12,
    padding: spacing.sm,
  },
  errorText: {
    fontSize: 13,
  },
});
