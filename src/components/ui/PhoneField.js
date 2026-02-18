import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';
import { Text } from './Text';
import { Input } from './Input';
import { CountryCodeSelect } from './CountryCodeSelect';

const digitsOnly = (value) => String(value || '').replace(/[^\d]/g, '');

const normalizePhoneE164 = (countryCode, national) => {
  const d = digitsOnly(national);
  const cleaned = d.replace(/^0+/, '');
  return `${countryCode}${cleaned}`;
};

const isValidNationalNumber = (national, minLength, maxLength) => {
  const d = digitsOnly(national);
  return d.length >= minLength && d.length <= maxLength;
};

/**
 * PhoneField
 * - Real-time validation (optional)
 * - Emits { countryCode, nationalNumber, e164, isValid }
 */
export function PhoneField({
  label,
  value,
  defaultCountryCode = '+962',
  onChange,

  // behavior
  required = true,
  minLength = 7,
  maxLength = 15,
  validateOnChange = true,
  showErrorOnBlur = true,

  // UI
  placeholder,
  error: externalError, // allow server-side error override
  containerStyle,
  rowStyle,
  countryMinWidth = 110,

  // optional callbacks
  onValidChange, // (boolean) => void
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();

  const initial = useMemo(() => {
    if (value && typeof value === 'object') {
      return {
        countryCode: value.countryCode || defaultCountryCode,
        nationalNumber: value.nationalNumber || '',
      };
    }
    return { countryCode: defaultCountryCode, nationalNumber: '' };
  }, [value, defaultCountryCode]);

  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [nationalNumber, setNationalNumber] = useState(initial.nationalNumber);

  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState('');

  // keep in sync if parent passes value object
  useEffect(() => {
    if (!value || typeof value !== 'object') return;

    const nextCC = typeof value.countryCode === 'string' ? value.countryCode : undefined;
    const nextNN = typeof value.nationalNumber === 'string' ? value.nationalNumber : undefined;

    if (nextCC !== undefined && nextCC !== countryCode) setCountryCode(nextCC);
    if (nextNN !== undefined && nextNN !== nationalNumber) setNationalNumber(nextNN);
  }, [value.countryCode, value.nationalNumber, countryCode, nationalNumber, value]);

  const computed = useMemo(() => {
    const rawDigits = digitsOnly(nationalNumber);
    const isEmpty = rawDigits.length === 0;

    if (required && isEmpty) {
      return { isValid: false, error: t('auth.validation.phoneRequired') };
    }

    if (!isEmpty && !isValidNationalNumber(nationalNumber, minLength, maxLength)) {
      return { isValid: false, error: t('auth.validation.phoneInvalid') };
    }

    return { isValid: true, error: '' };
  }, [nationalNumber, required, minLength, maxLength, t]);

  // emit changes
  const emit = (nextCountryCode, nextNationalNumber) => {
    const nn = digitsOnly(nextNationalNumber);
    const nextE164 = normalizePhoneE164(nextCountryCode, nn);

    const rawDigits = digitsOnly(nn);
    const isEmpty = rawDigits.length === 0;

    let isValid = true;
    if (required && isEmpty) isValid = false;
    if (!isEmpty && !isValidNationalNumber(nn, minLength, maxLength)) isValid = false;

    const payload = {
      countryCode: nextCountryCode,
      nationalNumber: nn,
      e164: nextE164,
      isValid,
    };

    // ✅ Only call onChange if it actually differs from parent
    const parentCC = value?.countryCode ?? defaultCountryCode;
    const parentNN = digitsOnly(value?.nationalNumber ?? "");
    if (parentCC !== payload.countryCode || parentNN !== payload.nationalNumber) {
      onChange?.(payload);
    }

    onValidChange?.(isValid);
  };


  // realtime validation
  useEffect(() => {
    if (!validateOnChange) return;
    if (!touched && showErrorOnBlur) return; // wait until blur/touch
    setInternalError(computed.error);
  }, [computed.error, validateOnChange, touched, showErrorOnBlur]);

  const shownError = externalError || internalError;

  const handleCountryChange = (cc) => {
    setCountryCode(cc);
    emit(cc, nationalNumber);
  };

  const handlePhoneChange = (text) => {
    const next = digitsOnly(text);
    setNationalNumber(next);
    emit(countryCode, next);
  };

  const handleBlur = () => {
    setTouched(true);
    if (showErrorOnBlur) setInternalError(computed.error);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text
          variant="bodySmall"
          weight="medium"
          style={[styles.label, isRTL ? styles.textRTL : styles.textLTR]}
        >
          {label}
        </Text>
      ) : null}

      <View style={[styles.row, isRTL ? styles.rowRTL : styles.rowLTR, rowStyle]}>
        <CountryCodeSelect
          value={countryCode}
          onChange={handleCountryChange}
          minWidth={countryMinWidth}
          style={{ marginBottom: 0 }}
        />

        <View style={styles.phoneFlex}>
          <Input
            label={null}
            placeholder={placeholder || t('auth.placeholders.phone')}
            value={nationalNumber}
            onChangeText={handlePhoneChange}
            onBlur={handleBlur}
            keyboardType="phone-pad"
            leftIcon="phone"
            error={shownError ? '' : null} // avoid double error (we render below)
            style={{ marginBottom: 0 }}
          />
        </View>
      </View>

      {shownError ? (
        <Text variant="caption" color={colors.error} style={styles.error}>
          {shownError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.sm,
  },
  row: {
    width: '100%',
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  phoneFlex: {
    flex: 1,
    minWidth: 0,
  },
  error: {
    marginTop: spacing.xs,
  },
  rowLTR: { flexDirection: 'row' },
  rowRTL: { flexDirection: 'row-reverse' },
  textLTR: { textAlign: 'left' },
  textRTL: { textAlign: 'right' },
});
