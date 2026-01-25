import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { useAuth } from '../services/auth/auth.store';
import { getAvailableServices } from '../services/services/services.catalog';
import { spacing, borderRadius } from '../theme/tokens';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function ServiceCard({ title, description, icon, color, onPress }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={animatedStyle}
    >
      <Card
        padding="large"
        style={[
          styles.serviceCard,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: color + '20' },
            isRTL ? { marginLeft: spacing.lg } : { marginRight: spacing.lg },
          ]}
        >
          <Feather name={icon} size={32} color={color} />
        </View>

        <View style={[styles.cardContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text variant="h4" weight="bold" style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {title}
          </Text>
          <Text
            variant="body"
            color={colors.textSecondary}
            style={[styles.cardDescription, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {description}
          </Text>
        </View>

        <View style={[styles.arrowContainer, { marginLeft: isRTL ? 0 : spacing.md, marginRight: isRTL ? spacing.md : 0 }]}>
          <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={colors.textMuted} />
        </View>
      </Card>
    </AnimatedTouchable>
  );
}

export function HomeServicesScreen() {
  const { colors, themePreference, setThemePreference } = useTheme();
  const { t, language, changeLanguage, isRTL } = useI18n();
  const router = useRouter();
  const { logout, session } = useAuth();
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLanguageSelect = async (nextLanguage) => {
    await changeLanguage(nextLanguage);
    Haptics.selectionAsync();
    setLanguageSheetOpen(false);
  };

  const handleThemeSelect = async (nextTheme) => {
    await setThemePreference(nextTheme);
    Haptics.selectionAsync();
    setThemeSheetOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const services = getAvailableServices(session).map((service) => ({
    ...service,
    title: t(service.titleKey),
    description: t(service.descriptionKey),
    color: colors[service.colorKey] || colors.accentOrange,
  }));

  return (
    <Screen safe scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.logoContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.sparkle,
                { backgroundColor: colors.accentOrange },
                isRTL ? styles.sparkleRtl : styles.sparkleLtr,
              ]}
            >
              <Text variant="h3">⚡</Text>
            </View>
            <Text variant="h2" weight="bold">
              {t('home.title')}
            </Text>
          </View>

          <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable
              onPress={() => setLanguageSheetOpen(true)}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="globe" size={16} color={colors.textPrimary} />
              <Text variant="caption" weight="semibold" style={{ color: colors.textPrimary }}>
                {language === 'en' ? t('language.shortEn') : t('language.shortAr')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setThemeSheetOpen(true)}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather
                name={themePreference === 'dark' ? 'moon' : themePreference === 'light' ? 'sun' : 'smartphone'}
                size={16}
                color={colors.textPrimary}
              />
            </Pressable>
            <Pressable
              onPress={() => setLogoutOpen(true)}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="log-out" size={16} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <Text
          variant="body"
          color={colors.textSecondary}
          style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {t('home.subtitle')}
        </Text>
      </View>

      <View style={styles.servicesContainer}>
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            title={service.title}
            description={service.description}
            icon={service.icon}
            color={service.color}
            onPress={async () => {
              if (!service.href) return;
              router.push(service.href);
            }}

          />
        ))}
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={languageSheetOpen}
        onRequestClose={() => setLanguageSheetOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="h4" weight="bold">
              {t('home.actions.languageTitle')}
            </Text>
            <Pressable
              onPress={() => handleLanguageSelect('en')}
              style={[
                styles.sheetItem,
                { borderColor: language === 'en' ? colors.accentOrange : colors.border },
              ]}
            >
              <Text variant="body" weight="semibold">
                {t('language.en')}
              </Text>
              {language === 'en' ? <Feather name="check" size={16} color={colors.accentOrange} /> : null}
            </Pressable>
            <Pressable
              onPress={() => handleLanguageSelect('ar')}
              style={[
                styles.sheetItem,
                { borderColor: language === 'ar' ? colors.accentOrange : colors.border },
              ]}
            >
              <Text variant="body" weight="semibold">
                {t('language.ar')}
              </Text>
              {language === 'ar' ? <Feather name="check" size={16} color={colors.accentOrange} /> : null}
            </Pressable>
            <Pressable onPress={() => setLanguageSheetOpen(false)} style={styles.sheetCancel}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={themeSheetOpen}
        onRequestClose={() => setThemeSheetOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="h4" weight="bold">
              {t('home.actions.themeTitle')}
            </Text>
            {[
              { value: 'light', label: t('theme.light'), icon: 'sun' },
              { value: 'dark', label: t('theme.dark'), icon: 'moon' },
              { value: 'system', label: t('theme.system'), icon: 'smartphone' },
            ].map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleThemeSelect(opt.value)}
                style={[
                  styles.sheetItem,
                  { borderColor: themePreference === opt.value ? colors.accentOrange : colors.border },
                ]}
              >
                <View style={styles.sheetItemRow}>
                  <Feather name={opt.icon} size={16} color={colors.textSecondary} />
                  <Text variant="body" weight="semibold">
                    {opt.label}
                  </Text>
                </View>
                {themePreference === opt.value ? (
                  <Feather name="check" size={16} color={colors.accentOrange} />
                ) : null}
              </Pressable>
            ))}
            <Pressable onPress={() => setThemeSheetOpen(false)} style={styles.sheetCancel}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={logoutOpen}
        onRequestClose={() => setLogoutOpen(false)}
      >
        <View style={styles.logoutBackdrop}>
          <View style={[styles.logoutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="h4" weight="bold">
              {t('home.actions.logoutTitle')}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.logoutSubtitle}>
              {t('home.actions.logoutSubtitle')}
            </Text>
            <View style={styles.logoutActions}>
              <Pressable
                onPress={() => setLogoutOpen(false)}
                style={[styles.logoutButton, { borderColor: colors.border }]}
              >
                <Text variant="bodySmall">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleLogout}
                style={[styles.logoutButton, { backgroundColor: colors.accentOrange }]}
              >
                <Text variant="bodySmall" weight="bold" style={{ color: colors.white }}>
                  {t('home.actions.logoutConfirm')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleLtr: {
    marginRight: spacing.md,
  },
  sparkleRtl: {
    marginLeft: spacing.md,
  },
  headerActions: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  servicesContainer: {
    gap: spacing.lg,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
  cardDescription: {
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: spacing.md,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetItem: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  logoutBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.lg,
  },
  logoutCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  logoutSubtitle: {
    marginTop: -spacing.sm,
  },
  logoutActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  logoutButton: {
    flex: 1,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
});
