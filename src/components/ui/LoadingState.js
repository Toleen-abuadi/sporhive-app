import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { Text } from './Text';

export function LoadingState({ message = 'Loading...', size = 'large' }) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.accentOrange} />
      {message && (
        <Text variant="body" color={colors.textSecondary} style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  message: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
