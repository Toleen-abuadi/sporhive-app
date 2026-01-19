import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { getColors } from '../../theme/colors';
import { radius, spacing, typography } from '../../theme/tokens';

export function TextField({ label, placeholder, value, onChangeText, mode = 'light' }) {
  const colors = getColors(mode);
  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
});
