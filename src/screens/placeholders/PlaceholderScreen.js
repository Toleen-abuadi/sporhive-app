import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

export function PlaceholderScreen({ title }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();

  const handleBackToHome = () => {
    navigation.navigate('Home');
  };

  return (
    <Screen safe>
      <View style={styles.container}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
          <Text variant="h1">🚧</Text>
        </View>

        <Text variant="h2" weight="bold" style={styles.title}>
          {title}
        </Text>

        <Text variant="h4" weight="semibold" style={styles.comingSoon}>
          {t('common.comingSoon')}
        </Text>

        <Text
          variant="body"
          color={colors.textSecondary}
          style={styles.message}
        >
          {t('placeholder.message')}
        </Text>

        <Button
          onPress={handleBackToHome}
          variant="primary"
          style={styles.button}
        >
          {t('common.backToHome')}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  comingSoon: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    marginBottom: spacing.xxl,
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    paddingHorizontal: spacing.xxl,
  },
});
