import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useI18n } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Text } from '../ui/Text';
import { borderRadius, spacing } from '../../theme/tokens';

export function QuickSettingsSheet({
  visible,
  onClose,
  onLogoutPress,
}) {
  const { t, language, changeLanguage, isRTL } = useI18n();
  const { themePreference, setThemePreference, colors } = useTheme();

  const languageOptions = [
    { value: 'en', label: t('language.shortEn') },
    { value: 'ar', label: t('language.shortAr') },
  ];

  const themeOptions = [
    { value: 'light', label: t('theme.light') },
    { value: 'dark', label: t('theme.dark') },
    { value: 'system', label: t('theme.system') },
  ];

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text variant="h4" weight="bold">
          {t('services.settings.title')}
        </Text>
        <Button variant="ghost" size="small" onPress={onClose}>
          {t('portal.common.close')}
        </Button>
      </View>

      <View style={styles.section}>
        <Text
          variant="bodySmall"
          weight="semibold"
          style={[styles.sectionLabel, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {t('services.settings.language')}
        </Text>
        <SegmentedControl
          value={language}
          onChange={changeLanguage}
          options={languageOptions}
        />
      </View>

      <View style={styles.section}>
        <Text
          variant="bodySmall"
          weight="semibold"
          style={[styles.sectionLabel, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {t('services.settings.theme')}
        </Text>
        <SegmentedControl
          value={themePreference}
          onChange={setThemePreference}
          options={themeOptions}
        />
      </View>

      <Pressable
        onPress={onLogoutPress}
        style={({ pressed }) => [
          styles.logoutButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Feather name="log-out" size={16} color={colors.textPrimary} />
        <Text variant="body" weight="semibold" style={styles.logoutText}>
          {t('services.settings.logout')}
        </Text>
      </Pressable>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    textAlign: 'left',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  logoutText: {
    textAlign: 'left',
  },
});
