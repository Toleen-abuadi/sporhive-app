import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { TopBar } from '../../src/components/ui/TopBar';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { spacing, typography } from '../../src/theme/tokens';

export default function RatingFormScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const resolvedToken = Array.isArray(token) ? token[0] : token;

  return (
    <Screen>
      <TopBar title="Rate booking" onBack={() => router.back()} />
      <View style={styles.container}>
        <Text style={styles.title}>Leave a rating</Text>
        <Text style={styles.subtitle}>Token: {resolvedToken}</Text>
        <PrimaryButton label="Submit" onPress={() => router.replace('/(playgrounds)')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
});
