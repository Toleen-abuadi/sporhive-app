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
import { BackButton } from '../../components/ui/BackButton';
import { portalApi } from '../../services/portal/portal.api';
import { usePortalAuth } from '../../services/portal/portal.hooks';
import { storage } from '../../services/storage/storage';
import { spacing } from '../../theme/tokens';

export function PortalLoginScreen() {
  const { colors } = useTheme();
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
          name: c.academy_name || c.label || 'Academy',
          subtitle: c.client_name || '',
          label: c.label || '',
        }));
        setAcademies(items);
      } else {
        setAcademyError(res?.error?.message || 'Unable to load academies.');
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
    if (academy?.name) return `Signing in to ${academy.name}`;
    return 'Select your academy to unlock your player portal.';
  }, [academy]);

  const onSubmit = async () => {
    setFormError('');
    if (!academy?.id) {
      setFormError('Please choose your academy.');
      return;
    }
    if (!username.trim() || !password) {
      setFormError('Enter both your username and password.');
      return;
    }

    const result = await login({ academyId: academy.id, username, password });
    if (result?.success) {
      setIsSuccess(true);
      fade.value = withTiming(0, { duration: 260 }, (finished) => {
        if (finished) runOnJS(router.replace)('/portal/(tabs)/home');
      });
    } else {
      setFormError(result?.error || error || 'Login failed. Please try again.');
    }
  };

  return (
    <Screen scroll contentContainerStyle={styles.scroll}>
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.background}
      >
        <PortalHeader title="Player Portal" subtitle={subtitle} leftSlot={<BackButton />} />

        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={fadeStyle}>
          <PortalCard style={styles.card}>
            <View style={styles.formRow}>
              <Input
                label="Username"
                placeholder="Email or phone"
                value={username}
                onChangeText={setUsername}
                leftIcon="user"
                autoCapitalize="none"
              />
              <Input
                label="Password"
                placeholder="••••••••"
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
                    Welcome back! Preparing your portal…
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity onPress={() => router.push('/portal/reset-password')}>
                <Text variant="bodySmall" color={colors.textSecondary} style={styles.forgot}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
              <Button
                onPress={onSubmit}
                loading={isLoading}
                disabled={!academy?.id || !username || !password}
                style={styles.button}
              >
                Enter Portal
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
