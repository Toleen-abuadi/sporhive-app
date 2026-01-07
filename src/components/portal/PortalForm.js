// src/components/portal/PortalForm.js
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing, radius, typography, alphaBg } from '../../theme/portal.styles';

export const Field = memo(({ label, hint, error, children }) => (
  <View style={{ marginBottom: spacing.md }}>
    {!!label && <Text style={styles.label}>{label}</Text>}
    {children}
    {!!hint && !error && <Text style={styles.hint}>{hint}</Text>}
    {!!error && <Text style={styles.error}>{error}</Text>}
  </View>
));

export const Input = memo(
  ({ value, onChangeText, placeholder, keyboardType, autoCapitalize, editable = true }) => (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize || 'none'}
      editable={editable}
      style={[styles.input, !editable ? { opacity: 0.65 } : null]}
    />
  )
);

export const TextArea = memo(({ value, onChangeText, placeholder }) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={colors.textTertiary}
    multiline
    style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]}
  />
));

export const Segmented = memo(({ options, value, onChange }) => (
  <View style={styles.segment}>
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <Pressable
          key={String(opt.value)}
          onPress={() => onChange(opt.value)}
          style={({ pressed }) => [
            styles.segmentItem,
            active ? styles.segmentActive : null,
            pressed ? { opacity: 0.9 } : null,
          ]}
        >
          <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
            {opt.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
));

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
    marginBottom: 6,
  },
  hint: {
    marginTop: 6,
    color: colors.textTertiary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.xs * 1.35,
  },
  error: {
    marginTop: 6,
    color: colors.error,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  input: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    color: colors.textPrimary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.base,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.backgroundElevated,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentActive: {
    backgroundColor: alphaBg(colors.primary, 0.18),
    borderColor: colors.primary,
  },
  segmentText: {
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
});
