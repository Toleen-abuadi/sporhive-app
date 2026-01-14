// Playgrounds public user identification screen.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Mail, Phone } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';
import { validators } from '../../utils/validators';
import { playgroundsStore } from '../../services/playgrounds/playgrounds.store';

const MODES = [
  { key: 'phone', label: 'Phone', icon: Phone },
  { key: 'email', label: 'Email', icon: Mail },
];

export function PlaygroundsIdentifyScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState('phone');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const gradient = useMemo(
    () => (isDark ? ['#0B1220', '#1F2937'] : ['#FFF7ED', '#E0F2FE']),
    [isDark]
  );

  useEffect(() => {
    let isMounted = true;
    playgroundsStore.getPublicUserId().then((publicUserId) => {
      if (!isMounted) return;
      if (publicUserId) {
        router.replace('/playgrounds');
      }
    });
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    const valid = mode === 'phone' ? validators.phone(trimmed) : validators.email(trimmed);

    if (!valid) {
      setError(mode === 'phone' ? 'Enter a valid phone number.' : 'Enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);

    const payload = mode === 'phone' ? { phone: trimmed } : { email: trimmed };
    const result = await playgroundsStore.identifyPublicUser(payload);

    setLoading(false);

    if (!result?.success) {
      setError('We could not verify your contact. Try again.');
      return;
    }

    const stored = await playgroundsStore.getPublicUserId();
    if (!stored) {
      setError('We could not save your access. Try again.');
      return;
    }

    router.replace('/playgrounds');
  };

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.hero}>
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
        <View style={styles.heroContent}>
          <Text variant="h2" weight="bold">
            Welcome to Playgrounds
          </Text>
          <Text variant="body" color={colors.textSecondary}>
            Tell us where to send confirmations and receipts.
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text variant="body" weight="semibold">
          Identify yourself
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          We use this to match your bookings across devices.
        </Text>

        <View style={styles.modeRow}>
          {MODES.map((item) => {
            const active = mode === item.key;
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  setMode(item.key);
                  setValue('');
                  setError('');
                }}
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: active ? colors.accentOrange : colors.surface,
                    borderColor: active ? colors.accentOrange : colors.border,
                  },
                ]}
              >
                <View style={styles.modeContent}>
                  <Icon size={16} color={active ? colors.white : colors.textPrimary} />
                  <Text variant="caption" weight="semibold" color={active ? colors.white : colors.textPrimary}>
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Input
          label={mode === 'phone' ? 'Phone number' : 'Email address'}
          placeholder={mode === 'phone' ? '+971 50 123 4567' : 'you@email.com'}
          keyboardType={mode === 'phone' ? 'phone-pad' : 'email-address'}
          value={value}
          onChangeText={setValue}
          error={error}
        />

        <Button onPress={handleSubmit} loading={loading} style={styles.submitButton}>
          Continue
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  hero: {
    margin: spacing.lg,
    borderRadius: 24,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroContent: {
    gap: spacing.sm,
  },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.md,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});
