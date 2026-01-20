// src/screens/JoinAcademyScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Linking,
  Pressable,
  Dimensions,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  interpolate,
  Extrapolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';


import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { endpoints } from '../services/api/endpoints';
import { API_BASE_URL } from '../services/api/client';

import { Screen } from '../components/ui/Screen';
import { AppHeader } from '../components/ui/AppHeader';
import { Card } from '../components/ui/Card';
import { Text } from '../components/ui/Text';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Divider } from '../components/ui/Divider';
import { useToast } from '../components/ui/ToastHost';
import { BackButton } from '../components/ui/BackButton';

import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Contact2,
  ClipboardList,
  Check,
  CalendarDays,
  X,
} from 'lucide-react-native';

import { ad, makeADTheme, pressableScaleConfig, getShadow } from '../theme/academyDiscovery.styles';

const { width: W } = Dimensions.get('window');

function safeText(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function isValidPhone(phone) {
  const p = String(phone || '').trim();
  const normalized = p.replace(/[^\d+]/g, '');
  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  return /^[0-9]{8,15}$/.test(digits);
}

function formatISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseISODate(iso) {
  const s = String(iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isoToDateOrNull(iso) {
  const d = parseISODate(iso);
  return d || null;
}

function maxDobISO(minAgeYears = 3) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - minAgeYears);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isAtLeastAge(dobISO, years) {
  const dob = parseISODate(dobISO);
  if (!dob) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= years;
}

function FieldHint({ theme, text }) {
  if (!text) return null;
  return (
    <Text variant="caption" style={{ color: theme.text.muted, marginTop: 6 }}>
      {text}
    </Text>
  );
}

/** Reanimated press-scale wrapper (doesn't change Button logic) */
function AnimatedPress({ children, disabled }) {
  const p = useSharedValue(0);

  const aStyle = useAnimatedStyle(() => {
    const s = interpolate(
      p.value,
      [0, 1],
      [pressableScaleConfig.from, pressableScaleConfig.to],
      Extrapolate.CLAMP
    );
    return { transform: [{ scale: s }] };
  }, []);

  const onIn = useCallback(() => {
    if (disabled) return;
    p.value = withTiming(1, {
      duration: pressableScaleConfig.in?.duration ?? 120,
      easing: Easing.out(Easing.quad),
    });
  }, [disabled, p]);

  const onOut = useCallback(() => {
    if (disabled) return;
    p.value = withTiming(0, {
      duration: pressableScaleConfig.out?.duration ?? 160,
      easing: Easing.out(Easing.quad),
    });
  }, [disabled, p]);

  return (
    <Animated.View style={aStyle} onTouchStart={onIn} onTouchEnd={onOut}>
      {children}
    </Animated.View>
  );
}

function SectionCard({ theme, icon, title, subtitle, children, enteringDelay = 0, right }) {
  return (
    <Animated.View entering={FadeInUp.delay(enteringDelay).duration(260)}>
      <Card style={[styles.dsCard, theme.shadow.md, { backgroundColor: theme.surface2, borderColor: theme.hairline }]}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.accent.orangeSoft, borderColor: theme.accent.orangeHair }]}>
              {icon}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="h4" weight="bold" numberOfLines={1} style={{ color: theme.text.primary }}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="caption" numberOfLines={2} style={{ color: theme.text.secondary, marginTop: 4 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          {right ? <View style={{ marginLeft: 10 }}>{right}</View> : null}
        </View>

        <View style={styles.sectionBody}>{children}</View>
      </Card>
    </Animated.View>
  );
}

function InlineErrorSummary({ theme, visible, errors, t }) {
  if (!visible) return null;
  const count = Object.keys(errors || {}).length;
  if (!count) return null;

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(160)}>
      <View style={[styles.summaryBar, theme.shadow.sm, { backgroundColor: theme.surface1, borderColor: theme.hairline }]}>
        <View style={[styles.summaryIcon, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.22)' }]}>
          <AlertCircle size={16} color="#EF4444" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="bold" numberOfLines={1} style={{ color: theme.text.primary }}>
            {t('academies.join.fixErrors', 'Please fix the highlighted fields.')}
          </Text>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.text.secondary, marginTop: 2 }}>
            {count} {count === 1 ? t('common.error', 'error') : t('common.errors', 'errors')}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function JoinAcademyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const slug = String(params?.slug || '').trim();

  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const toast = useToast();

  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);
  const isWide = W >= 410;

  const [loading, setLoading] = useState(true);
  const [academyBundle, setAcademyBundle] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [attempted, setAttempted] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    first_eng_name: '',
    middle_eng_name: '',
    last_eng_name: '',
    first_ar_name: '',
    middle_ar_name: '',
    last_ar_name: '',
    phone1: '',
    phone2: '',
    dob: '',
    notes: '',
  });

  const [dobPickerOpen, setDobPickerOpen] = useState(false);
  const [tempDob, setTempDob] = useState(null); // iOS temp selection
  const dobMax = useMemo(() => maxDobISO(3), []);

  const academy = academyBundle?.academy || academyBundle || null;

  const academyName = useMemo(() => {
    if (!academy) return '';
    return safeText(academy?.name_en) || safeText(academy?.name_ar) || safeText(academy?.name);
  }, [academy]);

  const logoUri = useMemo(() => {
    if (!academy?.slug) return null;
    if (!academy?.logo_meta?.has) return null;
    return `${API_BASE_URL}/public/academies/image/${encodeURIComponent(academy.slug)}/logo`;
  }, [academy]);

  const coverUri = useMemo(() => {
    if (!academy?.slug) return null;
    if (!academy?.cover_meta?.has) return null;
    return `${API_BASE_URL}/public/academies/image/${encodeURIComponent(academy.slug)}/cover`;
  }, [academy]);

  const contactPhones = useMemo(() => {
    const raw = academy?.contact_phones || academy?.phones_json || academy?.phones || [];
    if (Array.isArray(raw)) return raw.filter(Boolean).map((x) => String(x).trim()).filter(Boolean);
    if (typeof raw === 'string') return raw.split(',').map((x) => x.trim()).filter(Boolean);
    return [];
  }, [academy]);

  const contactEmail = useMemo(() => academy?.contact_email || academy?.email || '', [academy]);

  const showClosed = academy?.registration_enabled && !academy?.registration_open;
  const isContactOnly = !!academy && !academy?.registration_enabled;
  const isOpen = !showClosed && !isContactOnly && academy?.registration_enabled;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await endpoints.publicAcademies.getTemplate(slug, { include_images: true });
        const normalized = res?.data?.academy ? res.data : res?.academy ? res : { academy: res?.data || res };
        if (mounted) setAcademyBundle(normalized);
      } catch (e) {
        if (mounted) setLoadError(e?.message || t('common.error', 'Something went wrong'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug, t]);

  const setField = useCallback((key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
  }, []);

  const validateAll = useCallback(() => {
    const e = {};

    const latinNameRe = /^[A-Za-z][A-Za-z\s'-]{1,48}$/; // 2..49 chars
    const arabicNameRe = /^[\u0600-\u06FF][\u0600-\u06FF\s]{1,48}$/;

    const fe = safeText(form.first_eng_name);
    const le = safeText(form.last_eng_name);
    if (!fe) e.first_eng_name = t('academies.join.err.firstEngRequired', 'First name (English) is required.');
    else if (!latinNameRe.test(fe)) e.first_eng_name = t('academies.join.err.firstEngInvalid', 'Use English letters only.');
    if (!le) e.last_eng_name = t('academies.join.err.lastEngRequired', 'Last name (English) is required.');
    else if (!latinNameRe.test(le)) e.last_eng_name = t('academies.join.err.lastEngInvalid', 'Use English letters only.');

    const fa = safeText(form.first_ar_name);
    const la = safeText(form.last_ar_name);
    if (!fa) e.first_ar_name = t('academies.join.err.firstArRequired', 'First name (Arabic) is required.');
    else if (!arabicNameRe.test(fa)) e.first_ar_name = t('academies.join.err.firstArInvalid', 'استخدم أحرف عربية فقط.');
    if (!la) e.last_ar_name = t('academies.join.err.lastArRequired', 'Last name (Arabic) is required.');
    else if (!arabicNameRe.test(la)) e.last_ar_name = t('academies.join.err.lastArInvalid', 'استخدم أحرف عربية فقط.');

    if (!safeText(form.phone1)) e.phone1 = t('academies.join.err.phone1Required', 'Primary phone is required.');
    else if (!isValidPhone(form.phone1)) e.phone1 = t('academies.join.err.phoneInvalid', 'Invalid phone number.');
    if (safeText(form.phone2) && !isValidPhone(form.phone2)) e.phone2 = t('academies.join.err.phone2Invalid', 'Invalid secondary phone number.');

    const dob = safeText(form.dob);
    if (!dob) e.dob = t('academies.join.err.dobRequired', 'Date of birth is required.');
    else {
      const d = parseISODate(dob);
      if (!d) e.dob = t('academies.join.err.dobInvalid', 'Invalid date. Use YYYY-MM-DD.');
      else if (!isAtLeastAge(dob, 3)) e.dob = t('academies.join.err.dobMinAge', 'Player must be 3 years old or more.');
    }

    setErrors(e);
    return e;
  }, [form, t]);

  const submit = useCallback(async () => {
    if (!academy) return;

    if (!academy.registration_enabled) {
      toast?.warning?.(
        t('academies.join.disabled', 'This academy is not accepting registrations on SporHive.'),
        { title: t('common.notice', 'Notice') }
      );
      return;
    }
    if (!academy.registration_open) {
      toast?.warning?.(t('academies.join.closedToast', 'Registration is currently closed.'), {
        title: t('academies.join.closed', 'Closed'),
      });
      return;
    }

    setAttempted(true);
    const e = validateAll();
    if (Object.keys(e).length) {
      toast?.warning?.(t('academies.join.fixErrors', 'Please fix the highlighted fields.'), {
        title: t('common.checkForm', 'Check your form'),
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
        phone1: safeText(form.phone1),
        phone2: safeText(form.phone2) || '',
        dob: safeText(form.dob),
        notes: safeText(form.notes) || '',
      };

      await endpoints.publicAcademies.joinSubmit(slug, payload);
      setSubmitted(true);

      toast?.success?.(t('academies.join.sent', 'Request sent successfully!'), {
        title: t('common.done', 'Done'),
        actionLabel: t('academies.view', 'View academy'),
        onAction: () => router.push(`/academies/${slug}`),
      });
    } catch (e2) {
      toast?.error?.(e2?.message || t('common.error', 'Something went wrong'), {
        title: t('common.error', 'Error'),
      });
    } finally {
      setSubmitting(false);
    }
  }, [academy, form, slug, t, toast, validateAll, router]);

  // ===== Motion: screen enter =====
  const enterAnim = useMemo(() => FadeInDown.duration(340).easing(Easing.out(Easing.quad)), []);

  // Minimal dynamic styles (colors only) – keep <= 5
  const heroOverlay = useMemo(
    () => (isDark ? ['rgba(0,0,0,0.78)', 'rgba(0,0,0,0.26)', 'rgba(0,0,0,0.82)'] : ['rgba(0,0,0,0.50)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.60)']),
    [isDark]
  );

  const bottomGlass = useMemo(
    () => (isDark ? 'rgba(11,18,32,0.78)' : 'rgba(255,255,255,0.90)'),
    [isDark]
  );

  // ===== Loading =====
  if (loading) {
    return (
      <Screen safe scroll={false} style={ad.screen(theme)}>
        <View style={styles.pad}>
          <AppHeader
            title={t('academies.join.loading', 'Loading…')}
            leftSlot={<BackButton color={theme.text.primary} />}
          />
        </View>
      </Screen>
    );
  }

  // ===== Error / Not found =====
  if (loadError || !academy) {
    return (
      <Screen safe scroll style={ad.screen(theme)}>
        <View style={styles.pad}>
          <AppHeader
            title={t('academies.join.notFoundTitle', 'Academy not found')}
            leftSlot={<BackButton color={theme.text.primary} />}
          />
          <View style={styles.centerState}>
            <View style={[styles.stateIcon, { backgroundColor: 'rgba(239,68,68,0.14)', borderColor: 'rgba(239,68,68,0.22)' }]}>
              <AlertCircle size={34} color="#EF4444" />
            </View>
            <Text variant="h4" weight="bold" style={{ color: theme.text.primary, marginTop: 12 }}>
              {t('academies.join.notFoundTitle', 'Academy not found')}
            </Text>
            <Text variant="body" style={{ color: theme.text.secondary, marginTop: 10, textAlign: 'center' }}>
              {loadError || t('academies.join.notFoundSub', 'This academy might be unavailable.')}
            </Text>

            <View style={{ marginTop: 18 }}>
              <AnimatedPress>
                <Button onPress={() => router.push('/academies')}>
                  <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                    {t('academies.join.browse', 'Browse academies')}
                  </Text>
                </Button>
              </AnimatedPress>
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  // ===== Success panel (premium + motion, keeps behavior) =====
  if (submitted) {
    return (
      <Screen safe scroll={false} style={ad.screen(theme)}>
        <LinearGradient
          colors={isDark ? ['#0B1220', 'rgba(255,165,0,0.06)'] : ['#F8FAFC', 'rgba(255,165,0,0.10)']}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View entering={enterAnim} style={styles.successWrap}>
          <Card style={[styles.successCard, theme.shadow.lg, { backgroundColor: theme.surface2, borderColor: theme.hairline }]}>
            <View style={[styles.successIconWrap, { backgroundColor: theme.accent.orangeSoft, borderColor: theme.accent.orangeHair }]}>
              <CheckCircle2 size={34} color="#1CC479" />
            </View>

            <Text variant="h3" weight="bold" style={{ color: theme.text.primary, textAlign: 'center' }}>
              {t('academies.join.sentTitle', 'Request received')}
            </Text>

            <Text variant="body" style={{ color: theme.text.secondary, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
              {t('academies.join.sentSub', 'We sent your request to')}{' '}
              <Text weight="bold" style={{ color: theme.text.primary }}>
                {academyName}
              </Text>
              . {'\n'}
              {t('academies.join.sentHint', 'They will contact you soon via phone.')}
            </Text>

            <View style={styles.successActions}>
              <AnimatedPress>
                <Button variant="secondary" style={{ flex: 1 }} onPress={() => router.push(`/academies/${slug}`)}>
                  <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                    {t('academies.view', 'View academy')}
                  </Text>
                </Button>
              </AnimatedPress>

              <AnimatedPress>
                <Button style={{ flex: 1 }} onPress={() => router.push('/academies')}>
                  <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                    {t('academies.join.findMore', 'Discover more')}
                  </Text>
                </Button>
              </AnimatedPress>
            </View>

            <AnimatedPress>
              <Button variant="ghost" onPress={() => router.back()} style={{ marginTop: 12, alignSelf: 'center' }}>
                <Text variant="caption" weight="bold" style={{ color: theme.text.secondary }}>
                  {t('common.back', 'Back')}
                </Text>
              </Button>
            </AnimatedPress>
          </Card>
        </Animated.View>
      </Screen>
    );
  }

  // ===== Contact-only / Closed mode (kept) =====
  if (isContactOnly || showClosed) {
    return (
      <Screen safe scroll style={ad.screen(theme)}>
        <Animated.View entering={enterAnim} style={{ flex: 1 }}>
          {/* Hero header */}
          <View style={styles.hero}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <LinearGradient colors={isDark ? ['#0B1220', 'rgba(255,165,0,0.14)'] : ['#FFEDD5', '#F8FAFC']} style={StyleSheet.absoluteFill} />
            )}
            <LinearGradient colors={heroOverlay} style={StyleSheet.absoluteFill} />

            <View style={styles.heroTop}>
              <AnimatedPress>
                <BackButton color="white" style={styles.backBtn} />
              </AnimatedPress>
            </View>

            <View style={styles.heroBottom}>
              <View style={styles.heroTitleRow}>
                <View style={[styles.heroLogo, { borderColor: 'rgba(255,255,255,0.28)' }]}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <View style={styles.logoFallback}>
                      <Sparkles size={18} color="white" />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="h3" weight="bold" style={{ color: 'white' }} numberOfLines={1}>
                    {academyName}
                  </Text>

                  <View style={styles.heroBadgesRow}>
                    <Badge style={{ backgroundColor: showClosed ? 'rgba(239,68,68,0.90)' : 'rgba(0,0,0,0.55)' }}>
                      <Text variant="caption" weight="bold" style={{ color: 'white' }}>
                        {showClosed ? t('academies.join.closed', 'Closed') : t('academies.join.contact', 'Contact')}
                      </Text>
                    </Badge>

                    <Badge style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ShieldCheck size={12} color="white" />
                        <Text variant="caption" weight="bold" style={{ color: 'white' }}>
                          {' '}
                          {t('academies.join.secure', 'Secure')}
                        </Text>
                      </View>
                    </Badge>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.pad}>
            <Card style={[styles.dsCard, theme.shadow.md, { backgroundColor: theme.surface2, borderColor: theme.hairline }]}>
              <View style={styles.sectionBody}>
                <Text variant="h4" weight="bold" style={{ color: theme.text.primary }}>
                  {showClosed ? t('academies.join.closedTitle', 'Registration closed') : t('academies.join.contactTitle', 'Direct contact required')}
                </Text>
                <Text variant="body" style={{ color: theme.text.secondary, marginTop: 10, lineHeight: 22 }}>
                  {showClosed
                    ? t('academies.join.closedMsg', 'This academy is not currently accepting applications.')
                    : t('academies.join.contactMsg', 'Please contact the academy directly.')}
                </Text>

                <View style={{ marginTop: 16, gap: 10 }}>
                  {contactPhones.map((phone) => (
                    <AnimatedPress key={phone}>
                      <Button onPress={() => Linking.openURL(`tel:${phone}`)}>
                        <Phone size={16} color={theme.text.onDark} />
                        <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                          {' '}
                          {phone}
                        </Text>
                      </Button>
                    </AnimatedPress>
                  ))}

                  {contactEmail ? (
                    <AnimatedPress>
                      <Button variant="secondary" onPress={() => Linking.openURL(`mailto:${contactEmail}`)}>
                        <Mail size={16} color={theme.text.primary} />
                        <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                          {' '}
                          {contactEmail}
                        </Text>
                      </Button>
                    </AnimatedPress>
                  ) : null}
                </View>
              </View>
            </Card>
          </View>
        </Animated.View>
      </Screen>
    );
  }

  // ===== Main Guided Form =====
  const reviewNameEn = `${safeText(form.first_eng_name)} ${safeText(form.middle_eng_name)} ${safeText(form.last_eng_name)}`.replace(/\s+/g, ' ').trim();
  const reviewNameAr = `${safeText(form.first_ar_name)} ${safeText(form.middle_ar_name)} ${safeText(form.last_ar_name)}`.replace(/\s+/g, ' ').trim();
  const reviewDob = safeText(form.dob);
  const reviewPhone1 = safeText(form.phone1);
  const reviewPhone2 = safeText(form.phone2);

  return (
    <Screen safe scroll={false} style={ad.screen(theme)}>
      <Animated.View entering={enterAnim} style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Premium Hero */}
            <View style={styles.hero}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <LinearGradient colors={isDark ? ['#0B1220', 'rgba(255,165,0,0.12)'] : ['#FFEDD5', '#F8FAFC']} style={StyleSheet.absoluteFill} />
              )}
              <LinearGradient colors={heroOverlay} style={StyleSheet.absoluteFill} />

              <View style={styles.heroTop}>
                <AppHeader
                  title={t('academies.join.title', 'Join academy')}
                  subtitle={t('academies.join.subtitle', 'A short form — sent directly to the academy.')}
                  leftSlot={<BackButton color="white" />}
                />
              </View>

              <View style={styles.heroBottom}>
                <View style={styles.heroTitleRow}>
                  <View style={[styles.heroLogo, { borderColor: 'rgba(255,255,255,0.28)' }]}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                      <View style={styles.logoFallback}>
                        <Sparkles size={18} color="white" />
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="h3" weight="bold" style={{ color: 'white' }} numberOfLines={1}>
                      {academyName}
                    </Text>

                    <View style={styles.heroBadgesRow}>
                      <Badge style={{ backgroundColor: isOpen ? 'rgba(16,185,129,0.92)' : 'rgba(0,0,0,0.55)' }}>
                        <Text variant="caption" weight="bold" style={{ color: 'white' }}>
                          {isOpen ? t('academies.join.open', 'Open') : t('academies.join.contact', 'Contact')}
                        </Text>
                      </Badge>

                      <Badge style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ShieldCheck size={12} color="white" />
                          <Text variant="caption" weight="bold" style={{ color: 'white' }}>
                            {' '}
                            {t('academies.join.secure', 'Secure')}
                          </Text>
                        </View>
                      </Badge>
                    </View>
                  </View>
                </View>

                <View style={styles.stepRow}>
                  <View style={[styles.stepDot, { backgroundColor: 'rgba(255,149,0,0.98)' }]} />
                  <View style={[styles.stepDot, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                  <View style={[styles.stepDot, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                  <Text variant="caption" style={{ color: 'rgba(255,255,255,0.86)', marginLeft: 10 }}>
                    {t('academies.join.steps', 'Step 1 of 3 • Player details')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.pad}>
              <InlineErrorSummary theme={theme} visible={attempted} errors={errors} t={t} />

              {/* 1) Player identity */}
              <SectionCard
                theme={theme}
                icon={<User size={18} color={theme.accent.orange} />}
                title={t('academies.join.section.player', 'Player identity')}
                subtitle={t('academies.join.section.playerSub', 'Names in English and Arabic')}
                enteringDelay={40}
                right={
                  <Badge style={[styles.reqBadge, { backgroundColor: theme.surface1, borderColor: theme.hairline }]}>
                    <Text variant="caption" weight="bold" style={{ color: theme.text.secondary }}>
                      {t('common.required', '* required')}
                    </Text>
                  </Badge>
                }
              >
                <View style={styles.gridGap}>
                  <View style={[styles.rowOrCol, isWide && styles.row]}>
                    <View style={styles.flex1}>
                      <Input
                        label={t('academies.join.firstEng', 'First name (English) *')}
                        value={form.first_eng_name}
                        onChangeText={(v) => setField('first_eng_name', v)}
                        error={attempted ? errors.first_eng_name : ''}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Input
                        label={t('academies.join.middleEng', 'Middle (English)')}
                        value={form.middle_eng_name}
                        onChangeText={(v) => setField('middle_eng_name', v)}
                      />
                    </View>
                  </View>

                  <View style={[styles.rowOrCol, isWide && styles.row]}>
                    <View style={styles.flex1}>
                      <Input
                        label={t('academies.join.lastEng', 'Last name (English) *')}
                        value={form.last_eng_name}
                        onChangeText={(v) => setField('last_eng_name', v)}
                        error={attempted ? errors.last_eng_name : ''}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <View style={styles.softInfo}>
                        <Sparkles size={14} color={theme.text.secondary} />
                        <Text variant="caption" style={{ color: theme.text.secondary, marginLeft: 8 }}>
                          {t('academies.join.nameHint', 'Use official spelling to avoid delays.')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Divider />

                  <View style={[styles.rowOrCol, isWide && styles.row]}>
                    <View style={styles.flex1}>
                      <Input
                        label={t('academies.join.firstAr', 'First name (Arabic) *')}
                        value={form.first_ar_name}
                        onChangeText={(v) => setField('first_ar_name', v)}
                        error={attempted ? errors.first_ar_name : ''}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Input
                        label={t('academies.join.middleAr', 'Middle (Arabic)')}
                        value={form.middle_ar_name}
                        onChangeText={(v) => setField('middle_ar_name', v)}
                      />
                    </View>
                  </View>

                  <View style={[styles.rowOrCol, isWide && styles.row]}>
                    <View style={styles.flex1}>
                      <Input
                        label={t('academies.join.lastAr', 'Last name (Arabic) *')}
                        value={form.last_ar_name}
                        onChangeText={(v) => setField('last_ar_name', v)}
                        error={attempted ? errors.last_ar_name : ''}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <FieldHint theme={theme} text={t('academies.join.arHint', 'اكتب الاسم كما هو في الوثائق الرسمية.')} />
                    </View>
                  </View>
                </View>
              </SectionCard>

              {/* 2) Contact */}
              <SectionCard
                theme={theme}
                icon={<Contact2 size={18} color={theme.accent.orange} />}
                title={t('academies.join.section.contact', 'Contact')}
                subtitle={t('academies.join.section.contactSub', 'Where the academy can reach you')}
                enteringDelay={70}
              >
                <View style={styles.gridGap}>
                  <View style={[styles.rowOrCol, isWide && styles.row]}>
                    <View style={styles.flex1}>
                      <Input
                        label={t('academies.join.phone1', 'Phone number *')}
                        value={form.phone1}
                        onChangeText={(v) => setField('phone1', v)}
                        keyboardType="phone-pad"
                        placeholder="+9627XXXXXXX"
                        error={attempted ? errors.phone1 : ''}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Input
                        label={t('academies.join.phone2', 'Secondary phone')}
                        value={form.phone2}
                        onChangeText={(v) => setField('phone2', v)}
                        keyboardType="phone-pad"
                        placeholder={t('academies.join.optional', 'Optional')}
                        error={attempted ? errors.phone2 : ''}
                      />
                    </View>
                  </View>

                  <View style={styles.trustRow}>
                    <ShieldCheck size={14} color={theme.text.muted} />
                    <Text variant="caption" style={{ color: theme.text.muted, marginLeft: 8, flex: 1 }}>
                      {t('academies.join.trust', 'Your data is shared only with the academy for registration purposes.')}
                    </Text>
                  </View>
                </View>
              </SectionCard>

              {/* 3) Details */}
              <SectionCard
                theme={theme}
                icon={<ClipboardList size={18} color={theme.accent.orange} />}
                title={t('academies.join.section.details', 'Details')}
                subtitle={t('academies.join.section.detailsSub', 'Birth date and notes')}
                enteringDelay={100}
              >
                <View style={styles.gridGap}>
                  {/* DOB picker */}
                  <AnimatedPress>
                    <Pressable
                      onPress={() => {
                        const initial = isoToDateOrNull(form.dob) || new Date(`${dobMax}T00:00:00`);
                        setTempDob(initial);
                        setDobPickerOpen(true);
                      }}
                      style={styles.pressRow}
                    >
                      <View pointerEvents="none">
                        <Input
                          label={t('academies.join.dob', 'Date of birth *')}
                          value={form.dob}
                          placeholder={t('academies.join.dobPlaceholder', 'Tap to select')}
                          error={attempted ? errors.dob : ''}
                        />
                      </View>

                      <View style={[styles.dobAffordance, { backgroundColor: theme.accent.orangeSoft, borderColor: theme.accent.orangeHair }]}>
                        <CalendarDays size={18} color={theme.accent.orange} />
                      </View>
                    </Pressable>
                  </AnimatedPress>

                  {/* Android: inline picker when open */}
                  {dobPickerOpen && Platform.OS === 'android' ? (
                    <DateTimePicker
                      value={tempDob || new Date(`${dobMax}T00:00:00`)}
                      mode="date"
                      display="default"
                      maximumDate={new Date(`${dobMax}T00:00:00`)}
                      onChange={(event, selectedDate) => {
                        setDobPickerOpen(false);
                        if (event.type === 'dismissed') return;
                        if (!selectedDate) return;
                        setField('dob', formatISODate(selectedDate));
                      }}
                    />
                  ) : null}

                  {/* iOS: modal with Done/Cancel */}
                  {Platform.OS === 'ios' ? (
                    <Modal visible={dobPickerOpen} transparent animationType="fade" onRequestClose={() => setDobPickerOpen(false)}>
                      <Pressable style={styles.dobModalBackdrop} onPress={() => setDobPickerOpen(false)}>
                        <Pressable
                          style={[
                            styles.dobModalCard,
                            theme.shadow.lg,
                            { backgroundColor: theme.surface2, borderColor: theme.hairline },
                          ]}
                          onPress={() => {}}
                        >
                          <View style={styles.dobModalHead}>
                            <Text weight="bold" variant="bodySmall" style={{ color: theme.text.primary }}>
                              {t('academies.join.dob', 'Date of birth')}
                            </Text>
                            <AnimatedPress>
                              <Pressable onPress={() => setDobPickerOpen(false)} style={styles.dobCloseBtn}>
                                <X size={18} color={theme.text.primary} />
                              </Pressable>
                            </AnimatedPress>
                          </View>

                          <View style={{ marginTop: 10 }}>
                            <DateTimePicker
                              value={tempDob || new Date(`${dobMax}T00:00:00`)}
                              mode="date"
                              display="spinner"
                              maximumDate={new Date(`${dobMax}T00:00:00`)}
                              onChange={(event, selectedDate) => {
                                if (selectedDate) setTempDob(selectedDate);
                              }}
                            />
                          </View>

                          <View style={styles.dobModalActions}>
                            <AnimatedPress>
                              <Button variant="secondary" style={{ flex: 1 }} onPress={() => setDobPickerOpen(false)}>
                                <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                                  {t('common.cancel', 'Cancel')}
                                </Text>
                              </Button>
                            </AnimatedPress>

                            <AnimatedPress>
                              <Button
                                style={{ flex: 1 }}
                                onPress={() => {
                                  const finalDate = tempDob || new Date(`${dobMax}T00:00:00`);
                                  setField('dob', formatISODate(finalDate));
                                  setDobPickerOpen(false);
                                }}
                              >
                                <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                                  {t('common.done', 'Done')}
                                </Text>
                              </Button>
                            </AnimatedPress>
                          </View>
                        </Pressable>
                      </Pressable>
                    </Modal>
                  ) : null}

                  {/* Notes */}
                  <Input
                    label={t('academies.join.notes', 'Notes (optional)')}
                    value={form.notes}
                    onChangeText={(v) => setField('notes', v)}
                    placeholder={t('academies.join.notesPlaceholder', 'Any special requirements or questions…')}
                    multiline
                    numberOfLines={4}
                    maxLength={200}
                  />
                </View>
              </SectionCard>

              {/* 4) Review & Submit */}
              <SectionCard
                theme={theme}
                icon={<Check size={18} color={theme.accent.orange} />}
                title={t('academies.join.section.review', 'Review & submit')}
                subtitle={t('academies.join.section.reviewSub', 'Confirm details before sending')}
                enteringDelay={130}
              >
                <View style={styles.reviewList}>
                  <View style={[styles.reviewRow, { borderBottomColor: theme.hairline }]}>
                    <Text variant="caption" style={{ color: theme.text.muted }}>
                      {t('academies.join.review.nameEn', 'Name (English)')}
                    </Text>
                    <Text weight="bold" numberOfLines={1} style={{ color: theme.text.primary }}>
                      {reviewNameEn || '—'}
                    </Text>
                  </View>

                  <View style={[styles.reviewRow, { borderBottomColor: theme.hairline }]}>
                    <Text variant="caption" style={{ color: theme.text.muted }}>
                      {t('academies.join.review.nameAr', 'Name (Arabic)')}
                    </Text>
                    <Text weight="bold" numberOfLines={1} style={{ color: theme.text.primary }}>
                      {reviewNameAr || '—'}
                    </Text>
                  </View>

                  <View style={[styles.reviewRow, { borderBottomColor: theme.hairline }]}>
                    <Text variant="caption" style={{ color: theme.text.muted }}>
                      {t('academies.join.review.phone', 'Phone')}
                    </Text>
                    <Text weight="bold" numberOfLines={1} style={{ color: theme.text.primary }}>
                      {reviewPhone1 || '—'}
                      {reviewPhone2 ? ` • ${reviewPhone2}` : ''}
                    </Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text variant="caption" style={{ color: theme.text.muted }}>
                      {t('academies.join.review.dob', 'Date of birth')}
                    </Text>
                    <Text weight="bold" numberOfLines={1} style={{ color: theme.text.primary }}>
                      {reviewDob || '—'}
                    </Text>
                  </View>

                  <View style={[styles.reviewNotice, { backgroundColor: theme.surface1, borderColor: theme.hairline }]}>
                    <ShieldCheck size={16} color={theme.text.secondary} />
                    <Text variant="caption" style={{ color: theme.text.secondary, marginLeft: 8, flex: 1, lineHeight: 18 }}>
                      {t('academies.join.reviewHint', 'After you submit, the academy will review your request and contact you.')}
                    </Text>
                  </View>
                </View>
              </SectionCard>
            </View>
          </ScrollView>

          {/* Sticky bottom CTA (safe-area aware; guided + trust-first) */}
          <View style={[styles.bottomBar, getShadow(3, isDark), { backgroundColor: bottomGlass, borderTopColor: theme.hairline }]}>
            <View style={styles.bottomBarInner}>
              <View style={styles.bottomMini}>
                <Text variant="caption" style={{ color: theme.text.secondary }} numberOfLines={1}>
                  {t('academies.join.sendingTo', 'Sending to')} <Text weight="bold">{academyName}</Text>
                </Text>
              </View>

              <View style={styles.bottomActions}>
                <AnimatedPress disabled={submitting}>
                  <Button variant="secondary" style={styles.bottomBtn} onPress={() => router.back()} disabled={submitting}>
                    <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                      {t('common.cancel', 'Cancel')}
                    </Text>
                  </Button>
                </AnimatedPress>

                <AnimatedPress disabled={submitting}>
                  <Button style={styles.bottomBtn} onPress={submit} disabled={submitting}>
                    <Send size={16} color={theme.text.onDark} />
                    <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                      {' '}
                      {submitting ? t('academies.join.sending', 'Sending…') : t('academies.join.send', 'Send request')}
                    </Text>
                  </Button>
                </AnimatedPress>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 18 },
  scrollContent: { paddingBottom: 140 },

  // Hero
  hero: { height: 250, overflow: 'hidden' },
  heroTop: { position: 'absolute', top: 14, left: 0, right: 0, paddingHorizontal: 14 },
  heroBottom: { position: 'absolute', left: 18, right: 18, bottom: 18 },

  backBtn: { paddingHorizontal: 10 },
  heroTitleRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  heroLogo: {
    width: 62,
    height: 62,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  logoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  heroBadgesRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  stepDot: { width: 8, height: 8, borderRadius: 999, marginRight: 6 },

  // DS cards
  dsCard: { borderWidth: 1, borderRadius: 22, overflow: 'hidden', marginTop: 14 },
  sectionHead: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  sectionIcon: { width: 40, height: 40, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16 },

  reqBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },

  gridGap: { gap: 12 },
  rowOrCol: { flexDirection: 'column', gap: 12 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },

  softInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  trustRow: { flexDirection: 'row', alignItems: 'center', opacity: 0.95, marginTop: 2 },

  // DOB affordance
  pressRow: { position: 'relative' },
  dobAffordance: {
    position: 'absolute',
    right: 10,
    top: 34,
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // iOS DOB modal
  dobModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    padding: 18,
    justifyContent: 'flex-end',
  },
  dobModalCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  dobModalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dobCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dobModalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },

  // Review
  reviewList: { gap: 10 },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reviewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginTop: 6,
  },

  // Inline summary
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 6,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom sticky CTA
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
    paddingTop: 10,
  },
  bottomBarInner: { paddingHorizontal: 14, gap: 10 },
  bottomMini: { paddingHorizontal: 6 },
  bottomActions: { flexDirection: 'row', gap: 12 },
  bottomBtn: { flex: 1 },

  // States
  centerState: { marginTop: 40, alignItems: 'center' },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Success
  successWrap: { flex: 1, padding: 18, justifyContent: 'center' },
  successCard: { borderWidth: 1, borderRadius: 24, padding: 18 },
  successIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 14,
  },
  successActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
