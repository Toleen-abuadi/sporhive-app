import React, { useEffect } from 'react';
import { Image, SafeAreaView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Text';
import { useI18n } from '../services/i18n/i18n';
import { spacing, borderRadius, shadow } from '../theme/tokens';
import { storage, APP_STORAGE_KEYS } from '../services/storage/storage';

const logoSource = require('../../assets/images/icon.png');

export function WelcomeScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.04, {
        duration: 1600,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [scale]);

  useEffect(() => {
    storage.setItem(APP_STORAGE_KEYS.WELCOME_SEEN, true);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleExplore = async () => {
    await storage.setItem(APP_STORAGE_KEYS.WELCOME_SEEN, true);
    router.replace('/services');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Animated.Image
            source={logoSource}
            resizeMode="contain"
            style={[
              styles.logo,
              logoStyle,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.black,
              },
            ]}
            accessibilityLabel={t('welcome.logoLabel')}
          />
          <Text
            variant="h2"
            weight="bold"
            style={styles.title}
          >
            {t('welcome.title')}
          </Text>
          <Text
            variant="bodyLarge"
            color={colors.textSecondary}
            style={styles.subtitle}
          >
            {t('welcome.subtitle')}
          </Text>
        </View>
        <View style={styles.footer}>
          <Button size="large" onPress={handleExplore} accessibilityLabel={t('welcome.cta')}>
            {t('welcome.cta')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing['2xl'],
  },
  logo: {
    width: 130,
    height: 130,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    ...shadow.lg,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 320,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
