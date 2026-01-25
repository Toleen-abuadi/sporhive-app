import React, { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { borderRadius, fontSize, spacing } from '../../theme/tokens';

const DIGIT_REGEX = /[^\d]/g;

export function OTPInput({ value, onChange, length = 6, error }) {
  const { colors } = useTheme();
  const inputRef = useRef(null);

  const digits = useMemo(() => {
    const safe = String(value || '').replace(DIGIT_REGEX, '');
    return Array.from({ length }, (_, i) => safe[i] || '');
  }, [value, length]);

  const handleChange = (text) => {
    const next = String(text || '').replace(DIGIT_REGEX, '').slice(0, length);
    onChange?.(next);
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <Pressable onPress={focusInput} style={styles.container}>
      <View style={styles.row}>
        {digits.map((digit, index) => {
          const isActive = index === value?.length;
          const borderColor = error
            ? colors.error
            : isActive
              ? colors.accentOrange
              : colors.border;
          return (
            <View
              key={`otp-${index}`}
              style={[
                styles.digitBox,
                {
                  borderColor,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text variant="h4" weight="bold" style={{ color: colors.textPrimary }}>
                {digit || ' '}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={String(value || '')}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={length}
        style={styles.hiddenInput}
        autoFocus
      />
      {error ? (
        <Text variant="caption" color={colors.error} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  digitBox: {
    width: 44,
    height: 52,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  error: {
    textAlign: 'center',
    fontSize: fontSize.xs,
  },
});
