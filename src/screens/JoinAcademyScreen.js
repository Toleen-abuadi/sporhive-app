// src/screens/JoinAcademyScreen.js
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { endpoints } from '../services/api/endpoints';
import { API_BASE_URL } from '../services/api/client';

import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Text } from '../components/ui/Text';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PhoneField } from '../components/ui/PhoneField';
import { BackButton } from '../components/ui/BackButton';
import { useToast } from '../components/ui/ToastHost';
import { SporHiveLoader } from '../components/ui/SporHiveLoader';

import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Sparkles,
  ShieldCheck,
} from 'lucide-react-native';

import { ad, alphaHex, makeADTheme } from '../theme/academyDiscovery.styles';
import { borderRadius, spacing } from '../theme/tokens';
import { useSmartBack } from '../navigation/useSmartBack';

const TOTAL_STEPS = 3;
const MIN_AGE = 3;

const STEP_ONE_FIELDS = [
  'first_eng_name',
  'middle_eng_name',
  'last_eng_name',
  'first_ar_name',
  'middle_ar_name',
  'last_ar_name',
];
const STEP_TWO_FIELDS = ['phone1', 'phone2', 'dob'];
const STEP_THREE_FIELDS = [...STEP_ONE_FIELDS, ...STEP_TWO_FIELDS];

const LATIN_NAME_RE = /^[A-Za-z][A-Za-z\s'-]*$/;
const ARABIC_NAME_RE = /^[\u0600-\u06FF][\u0600-\u06FF\s'-]*$/;

const EMPTY_PHONE = {
  countryCode: '+962',
  nationalNumber: '',
  e164: '',
  isValid: false,
};

const INITIAL_FORM = {
  first_eng_name: '',
  middle_eng_name: '',
  last_eng_name: '',
  first_ar_name: '',
  middle_ar_name: '',
  last_ar_name: '',
  phone1: { ...EMPTY_PHONE },
  phone2: { ...EMPTY_PHONE },
  dob: '',
  notes: '',
};

function safeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function isPhoneFilled(phoneValue) {
  return digitsOnly(phoneValue?.nationalNumber).length > 0;
}

function isPhoneValid(phoneValue, min = 8, max = 15) {
  const digits = digitsOnly(phoneValue?.nationalNumber);
  if (!digits) return false;
  return digits.length >= min && digits.length <= max;
}

function formatISODate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseISODate(iso) {
  const value = safeText(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getAgeYears(iso) {
  const dob = parseISODate(iso);
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function formatLocalizedDate(iso, locale) {
  const parsed = parseISODate(iso);
  if (!parsed) return '';
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(parsed);
  } catch {
    return iso;
  }
}

function getMaxDobDate(minAgeYears = MIN_AGE) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - minAgeYears);
  return date;
}

function combineName(parts = []) {
  return parts.map((part) => safeText(part)).filter(Boolean).join(' ');
}

function getProgressPercent(step) {
  return Math.round((step / TOTAL_STEPS) * 100);
}

function isNameValid(value, isArabic = false) {
  const trimmed = safeText(value);
  if (trimmed.length < 2) return false;
  return (isArabic ? ARABIC_NAME_RE : LATIN_NAME_RE).test(trimmed);
}

function pickErrors(errors, keys) {
  return keys.reduce((acc, key) => {
    if (errors[key]) acc[key] = errors[key];
    return acc;
  }, {});
}

function formReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_PHONE':
      return {
        ...state,
        [action.field]: {
          ...(state[action.field] || EMPTY_PHONE),
          ...(action.value || {}),
        },
      };
    default:
      return state;
  }
}

function SectionCard({ theme, title, subtitle, right, children }) {
  return (
    <Card
      style={[
        styles.sectionCard,
        {
          backgroundColor: theme.surface2,
          borderColor: theme.hairline,
        },
        theme.shadow.md,
      ]}
      padding="none"
      elevated={false}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text variant="h4" weight="bold" style={{ color: theme.text.primary }}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" style={{ color: theme.text.secondary, marginTop: 4 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

function ReviewCard({ theme, title, isRTL, children }) {
  return (
    <View
      style={[
        styles.reviewCard,
        {
          backgroundColor: theme.surface1,
          borderColor: theme.hairline,
        },
      ]}
    >
      <View style={[styles.reviewHeader, isRTL && styles.rowReverse]}>
        <Text variant="bodyMedium" weight="bold" style={{ color: theme.text.primary }}>
          {title}
        </Text>
        <View
          style={[
            styles.reviewCheck,
            {
              backgroundColor: theme.accent.orangeSoft,
              borderColor: theme.accent.orangeHair,
            },
          ]}
        >
          <Check size={14} color={theme.accent.orange} />
        </View>
      </View>
      <View style={styles.reviewBody}>{children}</View>
    </View>
  );
}

function ReviewLine({ label, value, theme }) {
  return (
    <View style={styles.reviewLine}>
      <Text variant="caption" style={{ color: theme.text.secondary }}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="medium" style={{ color: theme.text.primary }}>
        {value}
      </Text>
    </View>
  );
}

export function JoinAcademyScreen({ slug: slugProp }) {
  const router = useRouter();
  const { goBack } = useSmartBack({ fallbackRoute: '/(app)/services' });
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const resolvedParamSlug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const slug = safeText(slugProp || resolvedParamSlug);

  const { colors, isDark } = useTheme();
  const { t, language, isRTL } = useI18n();
  const toast = useToast();

  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);
  const locale = language === 'ar' ? 'ar' : 'en';
  const requireArabicNames = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [academyBundle, setAcademyBundle] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [arabicExpanded, setArabicExpanded] = useState(requireArabicNames);

  const [form, dispatchForm] = useReducer(formReducer, INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [attemptedSteps, setAttemptedSteps] = useState({});

  const [dobPickerOpen, setDobPickerOpen] = useState(false);
  const [tempDob, setTempDob] = useState(getMaxDobDate(MIN_AGE));

  const maxDobDate = useMemo(() => getMaxDobDate(MIN_AGE), []);

  const scrollRef = useRef(null);
  const fieldPositions = useRef({});

  const academy = academyBundle?.academy || academyBundle || null;

  useEffect(() => {
    if (requireArabicNames) setArabicExpanded(true);
  }, [requireArabicNames]);

  useEffect(() => {
    const primaryCode = safeText(form.phone1?.countryCode || EMPTY_PHONE.countryCode);
    const secondaryDigits = digitsOnly(form.phone2?.nationalNumber);
    if (!secondaryDigits && primaryCode && form.phone2?.countryCode !== primaryCode) {
      dispatchForm({
        type: 'SET_PHONE',
        field: 'phone2',
        value: { countryCode: primaryCode },
      });
    }
  }, [form.phone1?.countryCode, form.phone2?.countryCode, form.phone2?.nationalNumber]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!slug) {
        if (mounted) {
          setLoadError(t('service.academy.join.notFound.subtitle'));
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setLoadError('');

      try {
        const res = await endpoints.publicAcademies.getTemplate(slug, { include_images: true });
        const normalized =
          res?.data?.academy
            ? res.data
            : res?.academy
              ? res
              : { academy: res?.data || res };

        if (mounted) {
          setAcademyBundle(normalized);
        }
      } catch (error) {
        if (mounted) {
          setLoadError(error?.message || t('service.academy.join.error.generic'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug, t]);

  const academyName = useMemo(() => {
    if (!academy) return '';
    return safeText(academy?.name_en) || safeText(academy?.name_ar) || safeText(academy?.name);
  }, [academy]);

  const logoUri = useMemo(() => {
    if (!academy?.slug || !academy?.logo_meta?.has) return null;
    return `${API_BASE_URL}/public/academies/image/${encodeURIComponent(academy.slug)}/logo`;
  }, [academy]);

  const contactPhones = useMemo(() => {
    const raw = academy?.contact_phones || academy?.phones_json || academy?.phones || [];
    if (Array.isArray(raw)) {
      return raw.map((item) => safeText(item)).filter(Boolean);
    }
    if (typeof raw === 'string') {
      return raw
        .split(',')
        .map((item) => safeText(item))
        .filter(Boolean);
    }
    return [];
  }, [academy]);

  const contactEmail = useMemo(
    () => safeText(academy?.contact_email || academy?.email),
    [academy]
  );

  const showClosed = academy?.registration_enabled && !academy?.registration_open;
  const isContactOnly = !!academy && !academy?.registration_enabled;

  const progressPercent = useMemo(() => getProgressPercent(currentStep), [currentStep]);
  const progressValue = useSharedValue(progressPercent);

  useEffect(() => {
    progressValue.value = withTiming(progressPercent, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [progressPercent, progressValue]);

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const setField = useCallback((field, value) => {
    dispatchForm({ type: 'SET_FIELD', field, value });
  }, []);

  const setPhoneField = useCallback((field, value) => {
    dispatchForm({ type: 'SET_PHONE', field, value });
  }, []);

  const markTouched = useCallback((field) => {
    setTouched((prev) => {
      if (prev[field]) return prev;
      return { ...prev, [field]: true };
    });
  }, []);

  const captureFieldPosition = useCallback(
    (field) => (event) => {
      fieldPositions.current[field] = event?.nativeEvent?.layout?.y ?? 0;
    },
    []
  );

  const scrollToError = useCallback(
    (field) => {
      const y = fieldPositions.current[field];
      if (typeof y === 'number') {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 18), animated: true });
      }
    },
    []
  );

  const validateStep = useCallback(
    (step, values = form) => {
      const allErrors = {};

      const firstEng = safeText(values.first_eng_name);
      const middleEng = safeText(values.middle_eng_name);
      const lastEng = safeText(values.last_eng_name);

      if (!firstEng) allErrors.first_eng_name = t('join.required');
      else if (!isNameValid(firstEng, false)) allErrors.first_eng_name = t('join.invalidName');

      if (middleEng && !isNameValid(middleEng, false)) {
        allErrors.middle_eng_name = t('join.invalidName');
      }

      if (!lastEng) allErrors.last_eng_name = t('join.required');
      else if (!isNameValid(lastEng, false)) allErrors.last_eng_name = t('join.invalidName');

      const firstAr = safeText(values.first_ar_name);
      const middleAr = safeText(values.middle_ar_name);
      const lastAr = safeText(values.last_ar_name);
      const hasAnyArabicValue = Boolean(firstAr || middleAr || lastAr);
      const shouldValidateArabic = requireArabicNames || hasAnyArabicValue;

      if (shouldValidateArabic) {
        if (!firstAr) allErrors.first_ar_name = t('join.required');
        else if (!isNameValid(firstAr, true)) allErrors.first_ar_name = t('join.invalidName');

        if (!lastAr) allErrors.last_ar_name = t('join.required');
        else if (!isNameValid(lastAr, true)) allErrors.last_ar_name = t('join.invalidName');
      }

      if (middleAr && !isNameValid(middleAr, true)) {
        allErrors.middle_ar_name = t('join.invalidName');
      }

      if (!isPhoneFilled(values.phone1)) {
        allErrors.phone1 = t('join.required');
      } else if (!isPhoneValid(values.phone1)) {
        allErrors.phone1 = t('join.invalidPhone');
      }

      if (isPhoneFilled(values.phone2) && !isPhoneValid(values.phone2)) {
        allErrors.phone2 = t('join.invalidPhone');
      }

      const dobISO = safeText(values.dob);
      if (!dobISO) {
        allErrors.dob = t('join.required');
      } else {
        const parsedDob = parseISODate(dobISO);
        if (!parsedDob) {
          allErrors.dob = t('join.pickDate');
        } else if (parsedDob > new Date()) {
          allErrors.dob = t('join.pickDate');
        } else {
          const age = getAgeYears(dobISO);
          if (age !== null && age < MIN_AGE) {
            allErrors.dob = t('service.academy.join.errors.dobMinAge');
          }
        }
      }

      const scope =
        step === 1
          ? STEP_ONE_FIELDS
          : step === 2
            ? STEP_TWO_FIELDS
            : STEP_THREE_FIELDS;

      const scopedErrors = pickErrors(allErrors, scope);

      return {
        isValid: Object.keys(scopedErrors).length === 0,
        errors: scopedErrors,
        allErrors,
      };
    },
    [form, requireArabicNames, t]
  );

  const currentStepValidation = useMemo(
    () => validateStep(currentStep, form),
    [currentStep, form, validateStep]
  );
  const reviewValidation = useMemo(() => validateStep(3, form), [form, validateStep]);

  const showFieldError = useCallback(
    (field) => {
      if (!errors[field]) return false;
      return Boolean(touched[field] || attemptedSteps[currentStep] || attemptedSteps[TOTAL_STEPS]);
    },
    [attemptedSteps, currentStep, errors, touched]
  );

  const goToStepError = useCallback(
    (step, stepErrors) => {
      const orderedFields =
        step === 1
          ? STEP_ONE_FIELDS
          : step === 2
            ? STEP_TWO_FIELDS
            : STEP_THREE_FIELDS;
      const firstInvalid = orderedFields.find((field) => stepErrors[field]);
      if (firstInvalid) scrollToError(firstInvalid);
    },
    [scrollToError]
  );

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => Math.max(1, prev - 1));
      return;
    }
    goBack();
  }, [currentStep, goBack]);

  const handleContinue = useCallback(() => {
    setAttemptedSteps((prev) => ({ ...prev, [currentStep]: true }));

    const result = validateStep(currentStep, form);
    setErrors(result.allErrors);

    if (!result.isValid) {
      if (result.errors.first_ar_name || result.errors.middle_ar_name || result.errors.last_ar_name) {
        setArabicExpanded(true);
      }
      goToStepError(currentStep, result.errors);
      toast?.warning?.(t('service.academy.join.errors.fix'), {
        title: t('service.academy.common.checkForm'),
      });
      return;
    }

    setCurrentStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  }, [currentStep, form, goToStepError, t, toast, validateStep]);

  const submit = useCallback(async () => {
    if (!academy) return;

    if (!academy.registration_enabled) {
      toast?.warning?.(t('service.academy.join.toast.disabled'), {
        title: t('service.academy.common.notice'),
      });
      return;
    }

    if (!academy.registration_open) {
      toast?.warning?.(t('service.academy.join.toast.closed'), {
        title: t('service.academy.join.badges.closed'),
      });
      return;
    }

    setAttemptedSteps((prev) => ({ ...prev, 1: true, 2: true, 3: true }));

    const result = validateStep(3, form);
    setErrors(result.allErrors);

    if (!result.isValid) {
      const hasStepOneError = STEP_ONE_FIELDS.some((key) => Boolean(result.allErrors[key]));
      const nextStep = hasStepOneError ? 1 : 2;
      setCurrentStep(nextStep);

      if (result.allErrors.first_ar_name || result.allErrors.middle_ar_name || result.allErrors.last_ar_name) {
        setArabicExpanded(true);
      }

      goToStepError(nextStep, result.allErrors);

      toast?.warning?.(t('service.academy.join.errors.fix'), {
        title: t('service.academy.common.checkForm'),
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: 'tryout',
        submit_code: null,
        first_eng_name: safeText(form.first_eng_name),
        middle_eng_name: safeText(form.middle_eng_name) || null,
        last_eng_name: safeText(form.last_eng_name),
        first_ar_name: safeText(form.first_ar_name),
        middle_ar_name: safeText(form.middle_ar_name) || null,
        last_ar_name: safeText(form.last_ar_name),
        phone1: safeText(form.phone1?.e164),
        phone2: safeText(form.phone2?.e164) || '',
        dob: safeText(form.dob),
        notes: safeText(form.notes) || '',
      };

      await endpoints.publicAcademies.joinSubmit(slug, payload);
      setSubmitted(true);

      toast?.success?.(t('service.academy.join.toast.sent'), {
        title: t('service.academy.common.done'),
        actionLabel: t('service.academy.join.actions.viewAcademy'),
        onAction: () => router.push(`/academies/${slug}`),
      });
    } catch (error) {
      toast?.error?.(error?.message || t('service.academy.common.errorMessage'), {
        title: t('service.academy.common.errorTitle'),
      });
    } finally {
      setSubmitting(false);
    }
  }, [academy, form, goToStepError, router, slug, t, toast, validateStep]);

  const openDobPicker = useCallback(() => {
    const initial = parseISODate(form.dob) || maxDobDate;
    setTempDob(initial);
    setDobPickerOpen(true);
  }, [form.dob, maxDobDate]);

  const closeDobPicker = useCallback(() => {
    setDobPickerOpen(false);
  }, []);

  const confirmDob = useCallback(() => {
    const finalDate = tempDob || maxDobDate;
    setField('dob', formatISODate(finalDate));
    markTouched('dob');
    setDobPickerOpen(false);
  }, [markTouched, maxDobDate, setField, tempDob]);

  const emptyValue = t('service.academy.common.emptyValue');
  const joinTitle = t('join.title', { academy: academyName || t('service.academy.common.defaultName') });
  const stepLabel = t('join.step', { step: currentStep, total: TOTAL_STEPS });

  const reviewNameEn = combineName([
    form.first_eng_name,
    form.middle_eng_name,
    form.last_eng_name,
  ]);
  const reviewNameAr = combineName([
    form.first_ar_name,
    form.middle_ar_name,
    form.last_ar_name,
  ]);

  const reviewPhonePrimary = safeText(form.phone1?.e164);
  const reviewPhoneSecondary = safeText(form.phone2?.e164);
  const reviewDob = formatLocalizedDate(form.dob, locale);
  const ageYears = getAgeYears(form.dob);

  const secondaryFooterLabel = currentStep === 3 ? t('join.cancel') : t('join.back');
  const primaryFooterLabel = currentStep === 3 ? t('join.sendRequest') : t('join.continue');

  const primaryFooterDisabled =
    currentStep === 3
      ? submitting || !reviewValidation.isValid
      : submitting || !currentStepValidation.isValid;

  const footerBottomPadding = Math.max(insets.bottom, spacing.md);
  const scrollBottomPadding = 124 + footerBottomPadding;

  if (loading) {
    return (
      <Screen safe scroll={false} style={ad.screen(theme)}>
        <SporHiveLoader label={t('service.academy.join.loading.title')} />
      </Screen>
    );
  }

  if (loadError || !academy) {
    return (
      <Screen safe scroll={false} style={ad.screen(theme)}>
        <View style={styles.stateContainer}>
          <BackButton color={theme.text.primary} onPress={goBack} />
          <Card
            style={[
              styles.stateCard,
              {
                backgroundColor: theme.surface2,
                borderColor: theme.hairline,
              },
            ]}
            elevated={false}
          >
            <View
              style={[
                styles.stateIcon,
                {
                  backgroundColor: alphaHex(theme.error, '18'),
                  borderColor: alphaHex(theme.error, '3A'),
                },
              ]}
            >
              <AlertCircle size={26} color={theme.error} />
            </View>

            <Text variant="h4" weight="bold" style={{ color: theme.text.primary, textAlign: 'center' }}>
              {t('service.academy.join.notFound.title')}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.text.secondary, textAlign: 'center', marginTop: 6 }}
            >
              {loadError || t('service.academy.join.notFound.subtitle')}
            </Text>

            <Button style={styles.stateButton} onPress={() => router.push('/academies')}>
              {t('service.academy.join.actions.browse')}
            </Button>
          </Card>
        </View>
      </Screen>
    );
  }

  if (submitted) {
    return (
      <Screen safe scroll={false} style={ad.screen(theme)}>
        <View style={styles.stateContainer}>
          <Card
            style={[
              styles.stateCard,
              {
                backgroundColor: theme.surface2,
                borderColor: theme.hairline,
              },
            ]}
            elevated={false}
          >
            <View
              style={[
                styles.stateIcon,
                {
                  backgroundColor: theme.accent.orangeSoft,
                  borderColor: theme.accent.orangeHair,
                },
              ]}
            >
              <CheckCircle2 size={26} color={theme.success} />
            </View>

            <Text variant="h3" weight="bold" style={{ color: theme.text.primary, textAlign: 'center' }}>
              {t('service.academy.join.success.title')}
            </Text>
            <Text
              variant="body"
              style={{ color: theme.text.secondary, textAlign: 'center', marginTop: 8 }}
            >
              {t('service.academy.join.success.subtitle')} {academyName}. {t('service.academy.join.success.hint')}
            </Text>

            <View style={[styles.stateActions, isRTL && styles.rowReverse]}>
              <Button
                variant="secondary"
                style={styles.stateActionBtn}
                onPress={() => router.push(`/academies/${slug}`)}
              >
                {t('service.academy.join.actions.viewAcademy')}
              </Button>
              <Button style={styles.stateActionBtn} onPress={() => router.push('/academies')}>
                {t('service.academy.join.actions.findMore')}
              </Button>
            </View>
          </Card>
        </View>
      </Screen>
    );
  }

  if (isContactOnly || showClosed) {
    return (
      <Screen safe scroll={false} style={ad.screen(theme)}>
        <View style={styles.simpleHeaderWrap}>
          <View style={[styles.simpleHeaderRow, isRTL && styles.rowReverse]}>
            <BackButton color={theme.text.primary} onPress={goBack} />
            <View style={[styles.simpleHeaderMeta, isRTL && styles.rowReverse]}>
              <View
                style={[
                  styles.headerAvatar,
                  {
                    backgroundColor: theme.surface1,
                    borderColor: theme.hairline,
                  },
                ]}
              >
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Sparkles size={16} color={theme.accent.orange} />
                )}
              </View>
              <View style={styles.headerTitleBlock}>
                <Text variant="bodySmall" style={{ color: theme.text.secondary }}>
                  {academyName}
                </Text>
                <Text variant="h4" weight="bold" style={{ color: theme.text.primary }}>
                  {showClosed
                    ? t('service.academy.join.closed.title')
                    : t('service.academy.join.contact.title')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] }}
          showsVerticalScrollIndicator={false}
        >
          <Card
            style={[
              styles.contactOnlyCard,
              {
                backgroundColor: theme.surface2,
                borderColor: theme.hairline,
              },
            ]}
            elevated={false}
          >
            <Text variant="body" style={{ color: theme.text.secondary }}>
              {showClosed
                ? t('service.academy.join.closed.message')
                : t('service.academy.join.contact.message')}
            </Text>

            <View style={styles.contactOnlyActions}>
              {contactPhones.map((phone) => (
                <Pressable
                  key={phone}
                  onPress={() => Linking.openURL(`tel:${phone}`)}
                  style={[
                    styles.contactAction,
                    {
                      backgroundColor: theme.surface1,
                      borderColor: theme.hairline,
                    },
                  ]}
                >
                  <Phone size={16} color={theme.text.secondary} />
                  <Text variant="bodySmall" weight="medium" style={{ color: theme.text.primary }}>
                    {phone}
                  </Text>
                </Pressable>
              ))}

              {contactEmail ? (
                <Pressable
                  onPress={() => Linking.openURL(`mailto:${contactEmail}`)}
                  style={[
                    styles.contactAction,
                    {
                      backgroundColor: theme.surface1,
                      borderColor: theme.hairline,
                    },
                  ]}
                >
                  <Mail size={16} color={theme.text.secondary} />
                  <Text variant="bodySmall" weight="medium" style={{ color: theme.text.primary }}>
                    {contactEmail}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen safe scroll={false} style={ad.screen(theme)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={[
              styles.stickyHeader,
              {
                backgroundColor: theme.surface2,
                borderBottomColor: theme.hairline,
              },
            ]}
          >
            <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
              <BackButton color={theme.text.primary} onPress={handleBack} />

              <View style={[styles.headerMeta, isRTL && styles.rowReverse]}>
                <View
                  style={[
                    styles.headerAvatar,
                    {
                      backgroundColor: theme.surface1,
                      borderColor: theme.hairline,
                    },
                  ]}
                >
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <Sparkles size={16} color={theme.accent.orange} />
                  )}
                </View>

                <View style={styles.headerTitleBlock}>
                  <Text variant="caption" style={{ color: theme.text.secondary }} numberOfLines={1}>
                    {joinTitle}
                  </Text>
                  <Text variant="h4" weight="bold" style={{ color: theme.text.primary }} numberOfLines={1}>
                    {academyName}
                  </Text>
                  <Text variant="caption" style={{ color: theme.text.secondary }} numberOfLines={1}>
                    {stepLabel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.progressRow, isRTL && styles.rowReverse]}>
              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor: alphaHex(theme.accent.orange, isDark ? '33' : '1F'),
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.accent.orange,
                    },
                    progressFillStyle,
                  ]}
                />
              </View>
              <Text variant="caption" weight="bold" style={{ color: theme.text.secondary }}>
                {`${progressPercent}%`}
              </Text>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: scrollBottomPadding,
              gap: spacing.md,
            }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              key={`join-step-${currentStep}`}
              entering={FadeInDown.duration(220)}
              exiting={FadeOutDown.duration(160)}
            >
              {currentStep === 1 ? (
                <View style={styles.stepStack}>
                  <SectionCard
                    theme={theme}
                    title={t('join.playerIdentity')}
                    subtitle={t('join.playerIdentitySubtitle')}
                  >
                    <View style={styles.fieldStack}>
                      <View onLayout={captureFieldPosition('first_eng_name')}>
                        <Input
                          label={t('join.firstName')}
                          value={form.first_eng_name}
                          onChangeText={(value) => setField('first_eng_name', value)}
                          onEndEditing={() => markTouched('first_eng_name')}
                          textAlign={isRTL ? 'right' : 'left'}
                          error={showFieldError('first_eng_name') ? errors.first_eng_name : ''}
                        />
                      </View>

                      <View onLayout={captureFieldPosition('middle_eng_name')}>
                        <Input
                          label={t('join.middleName')}
                          value={form.middle_eng_name}
                          onChangeText={(value) => setField('middle_eng_name', value)}
                          onEndEditing={() => markTouched('middle_eng_name')}
                          textAlign={isRTL ? 'right' : 'left'}
                          error={showFieldError('middle_eng_name') ? errors.middle_eng_name : ''}
                        />
                      </View>

                      <View onLayout={captureFieldPosition('last_eng_name')}>
                        <Input
                          label={t('join.lastName')}
                          value={form.last_eng_name}
                          onChangeText={(value) => setField('last_eng_name', value)}
                          onEndEditing={() => markTouched('last_eng_name')}
                          textAlign={isRTL ? 'right' : 'left'}
                          error={showFieldError('last_eng_name') ? errors.last_eng_name : ''}
                        />
                      </View>
                    </View>

                    <Pressable
                      onPress={() => setArabicExpanded((prev) => !prev)}
                      style={[
                        styles.accordionRow,
                        {
                          borderColor: theme.hairline,
                          backgroundColor: theme.surface1,
                        },
                      ]}
                    >
                      <View style={[styles.accordionRowInner, isRTL && styles.rowReverse]}>
                        <View style={[styles.accordionTitleWrap, isRTL && styles.rowReverse]}>
                          <Text variant="bodySmall" weight="semibold" style={{ color: theme.text.primary }}>
                            {t('join.arabicName')}
                          </Text>
                          {!requireArabicNames ? (
                            <Text variant="caption" style={{ color: theme.text.secondary }}>
                              ({t('join.optional')})
                            </Text>
                          ) : null}
                        </View>

                        {arabicExpanded ? (
                          <ChevronUp size={18} color={theme.text.secondary} />
                        ) : (
                          <ChevronDown size={18} color={theme.text.secondary} />
                        )}
                      </View>
                    </Pressable>

                    {arabicExpanded ? (
                      <Animated.View entering={FadeInDown.duration(180)} style={styles.fieldStack}>
                        <View onLayout={captureFieldPosition('first_ar_name')}>
                          <Input
                            label={t('join.firstName')}
                            value={form.first_ar_name}
                            onChangeText={(value) => setField('first_ar_name', value)}
                            onEndEditing={() => markTouched('first_ar_name')}
                            textAlign={isRTL ? 'right' : 'left'}
                            error={showFieldError('first_ar_name') ? errors.first_ar_name : ''}
                          />
                        </View>

                        <View onLayout={captureFieldPosition('middle_ar_name')}>
                          <Input
                            label={t('join.middleName')}
                            value={form.middle_ar_name}
                            onChangeText={(value) => setField('middle_ar_name', value)}
                            onEndEditing={() => markTouched('middle_ar_name')}
                            textAlign={isRTL ? 'right' : 'left'}
                            error={showFieldError('middle_ar_name') ? errors.middle_ar_name : ''}
                          />
                        </View>

                        <View onLayout={captureFieldPosition('last_ar_name')}>
                          <Input
                            label={t('join.lastName')}
                            value={form.last_ar_name}
                            onChangeText={(value) => setField('last_ar_name', value)}
                            onEndEditing={() => markTouched('last_ar_name')}
                            textAlign={isRTL ? 'right' : 'left'}
                            error={showFieldError('last_ar_name') ? errors.last_ar_name : ''}
                          />
                        </View>
                      </Animated.View>
                    ) : null}
                  </SectionCard>
                </View>
              ) : null}

              {currentStep === 2 ? (
                <View style={styles.stepStack}>
                  <SectionCard theme={theme} title={t('join.contact')} subtitle={t('join.phoneOnDetails')}>
                    <View style={styles.fieldStack}>
                      <View onLayout={captureFieldPosition('phone1')}>
                        <PhoneField
                          label={t('join.primaryPhone')}
                          value={form.phone1}
                          onChange={(payload) => {
                            setPhoneField('phone1', payload);
                            if (isPhoneFilled(payload)) markTouched('phone1');
                          }}
                          minLength={8}
                          maxLength={15}
                          required
                          error={showFieldError('phone1') ? errors.phone1 : ''}
                        />
                      </View>

                      <View onLayout={captureFieldPosition('phone2')}>
                        <PhoneField
                          label={t('join.secondPhone')}
                          value={form.phone2}
                          onChange={(payload) => {
                            setPhoneField('phone2', payload);
                            if (isPhoneFilled(payload)) markTouched('phone2');
                          }}
                          minLength={8}
                          maxLength={15}
                          required={false}
                          error={showFieldError('phone2') ? errors.phone2 : ''}
                        />
                      </View>
                    </View>

                    <View
                      style={[
                        styles.infoRow,
                        {
                          backgroundColor: theme.surface1,
                          borderColor: theme.hairline,
                        },
                      ]}
                    >
                      <ShieldCheck size={14} color={theme.text.secondary} />
                      <Text variant="caption" style={{ color: theme.text.secondary, flex: 1 }}>
                        {t('join.phonePrivacy')}
                      </Text>
                    </View>
                  </SectionCard>

                  <SectionCard theme={theme} title={t('join.details')}>
                    <View style={styles.fieldStack}>
                      <View onLayout={captureFieldPosition('dob')}>
                        <Pressable onPress={openDobPicker} style={styles.dobPressable}>
                          <View pointerEvents="none" style={{ flex: 1 }}>
                            <Input
                              label={t('join.dob')}
                              value={reviewDob}
                              placeholder={t('join.pickDate')}
                              editable={false}
                              error={showFieldError('dob') ? errors.dob : ''}
                            />
                          </View>

                          <View
                            style={[
                              styles.calendarBtn,
                              {
                                backgroundColor: theme.accent.orangeSoft,
                                borderColor: theme.accent.orangeHair,
                              },
                            ]}
                          >
                            <CalendarDays size={16} color={theme.accent.orange} />
                          </View>
                        </Pressable>
                      </View>

                      {typeof ageYears === 'number' ? (
                        <Text variant="caption" style={{ color: theme.text.secondary }}>
                          {t('join.age', { age: ageYears })}
                        </Text>
                      ) : null}

                      <Input
                        label={t('join.notes')}
                        value={form.notes}
                        onChangeText={(value) => setField('notes', value)}
                        textAlign={isRTL ? 'right' : 'left'}
                        placeholder={t('join.notesPlaceholder')}
                        multiline
                        numberOfLines={4}
                        maxLength={240}
                      />
                    </View>
                  </SectionCard>
                </View>
              ) : null}

              {currentStep === 3 ? (
                <View style={styles.stepStack}>
                  <SectionCard
                    theme={theme}
                    title={t('join.reviewSubmit')}
                    subtitle={t('join.reviewHint')}
                  >
                    <View style={styles.reviewStack}>
                      <ReviewCard theme={theme} title={t('join.player')} isRTL={isRTL}>
                        <ReviewLine label={t('join.firstName')} value={reviewNameEn || emptyValue} theme={theme} />
                        <ReviewLine
                          label={t('join.arabicName')}
                          value={reviewNameAr || t('service.academy.common.notFound')}
                          theme={theme}
                        />
                      </ReviewCard>

                      <ReviewCard theme={theme} title={t('join.contact')} isRTL={isRTL}>
                        <ReviewLine label={t('join.primaryPhone')} value={reviewPhonePrimary || emptyValue} theme={theme} />
                        <ReviewLine label={t('join.secondPhone')} value={reviewPhoneSecondary || emptyValue} theme={theme} />
                        <ReviewLine label={t('join.dob')} value={reviewDob || emptyValue} theme={theme} />
                      </ReviewCard>

                      <ReviewCard theme={theme} title={t('join.academy')} isRTL={isRTL}>
                        <ReviewLine label={t('join.academy')} value={academyName || emptyValue} theme={theme} />
                        <ReviewLine
                          label={t('service.academy.card.sport')}
                          value={safeText(academy?.sport_name || academy?.sport || emptyValue)}
                          theme={theme}
                        />
                      </ReviewCard>
                    </View>

                    <View style={styles.trustStack}>
                      <View style={[styles.trustRow, isRTL && styles.rowReverse]}>
                        <ShieldCheck size={15} color={theme.text.secondary} />
                        <Text variant="caption" style={{ color: theme.text.secondary }}>
                          {t('join.secureEncrypted')}
                        </Text>
                      </View>

                      <View style={[styles.trustRow, isRTL && styles.rowReverse]}>
                        <Sparkles size={15} color={theme.text.secondary} />
                        <Text variant="caption" style={{ color: theme.text.secondary }}>
                          {t('join.responseTime')}
                        </Text>
                      </View>
                    </View>
                  </SectionCard>
                </View>
              ) : null}
            </Animated.View>
          </ScrollView>

          <View
            style={[
              styles.footerWrap,
              {
                borderTopColor: theme.hairline,
                backgroundColor: alphaHex(theme.surface0, isDark ? 'F0' : 'FA'),
                paddingBottom: footerBottomPadding,
              },
            ]}
          >
            <View
              style={[
                styles.footerCard,
                {
                  backgroundColor: theme.surface2,
                  borderColor: theme.hairline,
                },
                theme.shadow.sm,
              ]}
            >
              <View style={[styles.footerActions, isRTL && styles.rowReverse]}>
                <Button
                  variant="secondary"
                  style={styles.footerBtn}
                  onPress={currentStep === 3 ? goBack : handleBack}
                  disabled={submitting}
                >
                  {secondaryFooterLabel}
                </Button>

                <Button
                  style={styles.footerBtn}
                  onPress={currentStep === 3 ? submit : handleContinue}
                  disabled={primaryFooterDisabled}
                  loading={currentStep === 3 && submitting}
                >
                  {primaryFooterLabel}
                </Button>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {dobPickerOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={tempDob || maxDobDate}
          mode="date"
          display="default"
          maximumDate={maxDobDate}
          onChange={(event, date) => {
            setDobPickerOpen(false);
            if (event.type === 'dismissed') return;
            if (!date) return;
            setField('dob', formatISODate(date));
            markTouched('dob');
          }}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={dobPickerOpen} transparent animationType="fade" onRequestClose={closeDobPicker}>
          <Pressable
            style={[styles.dobBackdrop, { backgroundColor: alphaHex(theme.black, '7A') }]}
            onPress={closeDobPicker}
          >
            <Pressable
              onPress={() => {}}
              style={[
                styles.dobSheet,
                {
                  backgroundColor: theme.surface2,
                  borderColor: theme.hairline,
                },
                theme.shadow.lg,
              ]}
            >
              <Text variant="bodyMedium" weight="bold" style={{ color: theme.text.primary }}>
                {t('join.dob')}
              </Text>

              <View style={{ marginTop: spacing.sm }}>
                <DateTimePicker
                  value={tempDob || maxDobDate}
                  mode="date"
                  display="spinner"
                  maximumDate={maxDobDate}
                  onChange={(_event, date) => {
                    if (date) setTempDob(date);
                  }}
                />
              </View>

              <View style={[styles.dobActions, isRTL && styles.rowReverse]}>
                <Button variant="secondary" style={styles.footerBtn} onPress={closeDobPicker}>
                  {t('join.cancel')}
                </Button>
                <Button style={styles.footerBtn} onPress={confirmDob}>
                  {t('common.done')}
                </Button>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
  },

  stepStack: {
    gap: spacing.md,
  },

  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },

  fieldStack: {
    gap: spacing.sm,
  },

  accordionRow: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  accordionRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  accordionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  infoRow: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  dobPressable: {
    position: 'relative',
  },
  calendarBtn: {
    position: 'absolute',
    top: 34,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewStack: {
    gap: spacing.sm,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reviewCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBody: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  reviewLine: {
    gap: 2,
  },

  trustStack: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  footerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  footerCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.sm,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerBtn: {
    flex: 1,
  },

  dobBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  dobSheet: {
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
  },
  dobActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  stateContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 22,
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateButton: {
    marginTop: spacing.sm,
    minWidth: 180,
  },
  stateActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  stateActionBtn: {
    flex: 1,
  },

  simpleHeaderWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  simpleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  simpleHeaderMeta: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  contactOnlyCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
  },
  contactOnlyActions: {
    gap: spacing.sm,
  },
  contactAction: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
