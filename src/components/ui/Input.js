import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, fontSize } from '../../theme/tokens';
import { Text } from './Text';

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  style,
  ...props
}) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const toggleSecure = () => {
    setIsSecure(!isSecure);
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text variant="bodySmall" weight="medium" style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : isFocused ? colors.accentOrange : colors.border,
          },
        ]}
      >
        {leftIcon && (
          <Feather name={leftIcon} size={20} color={colors.textMuted} style={styles.leftIcon} />
        )}

        <TextInput
          style={[
            styles.input,
            {
              color: colors.textPrimary,
            },
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity onPress={toggleSecure} style={styles.rightIcon}>
            <Feather
              name={isSecure ? 'eye-off' : 'eye'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Feather name={rightIcon} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text variant="caption" color={colors.error} style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  error: {
    marginTop: spacing.xs,
  },
});
