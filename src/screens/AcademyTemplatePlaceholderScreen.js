import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../components/ui/Screen';
import { AppHeader } from '../components/ui/AppHeader';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { spacing } from '../theme/tokens';
import { Sparkles } from 'lucide-react-native';
import { BackButton } from '../components/ui/BackButton';

export function AcademyTemplatePlaceholderScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams();
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <Screen safe scroll>
      <View style={{ padding: spacing.lg }}>
        <AppHeader
          title={t('academies.template.title', 'Academy profile')}
          subtitle={t('academies.template.subtitle', 'We will build this page next.')}
          leftSlot={<BackButton />}
        />

        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <Sparkles size={42} color={colors.accentOrange} />
          <Text variant="h4" weight="bold" style={{ marginTop: spacing.md, color: colors.textPrimary }}>
            {t('common.comingSoon', 'Coming Soon')}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: spacing.sm }}>
            {t('academies.template.comingSoon', 'Template page for')} <Text weight="bold">{String(slug || '')}</Text>
          </Text>

          <Button style={{ marginTop: spacing.lg }} onPress={() => router.push('/academies')}>
            <Text variant="caption" weight="bold" style={{ color: colors.white }}>{t('academies.discovery.title', 'Discover academies')}</Text>
          </Button>
        </View>
      </View>
    </Screen>
  );
}
