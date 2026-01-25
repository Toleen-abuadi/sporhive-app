// src/screens/portal/PortalRenewalsScreen.js
// Fixed:
// - invalid colors "undefined80" by safe alpha() helper
// - correct RefreshControl usage
// - removed web-only "spinning" style
// - safer gradients & borders

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing,
  Dimensions,
  RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import {
  Calendar,
  ChevronDown,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  Clock,
  Users,
  CalendarDays,
  Target,
  Sparkles,
  ShieldCheck,
  BadgeCheck,
  Zap,
  CalendarClock,
} from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';

import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';

import { useToast } from '../../components/ui/ToastHost';
import { useTranslation } from '../../services/i18n/i18n';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ----------------------- Safe helpers -----------------------
function safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function parseISODate(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(d) {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysDiff(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatPrettyDate(d, locale, placeholder) {
  if (!d) return placeholder;
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(d);
  } catch {
    return toISODate(d);
  }
}

// Adds alpha to a hex color safely.
function alpha(base, aHex = '80') {
  if (!base || typeof base !== 'string') return base;
  const hex = base.replace('#', '');
  if (hex.length === 3) {
    const r = hex[0] + hex[0];
    const g = hex[1] + hex[1];
    const b = hex[2] + hex[2];
    return `#${r}${g}${b}${aHex}`;
  }
  if (hex.length === 6) return `#${hex}${aHex}`;
  if (hex.length === 8) return `#${hex.slice(0, 6)}${aHex}`;
  return base;
}

function weekdayLabel(day) {
  return day;
}

function computeSessionsPerWeekFromGroup(group) {
  if (typeof group?.sessions_per_week === 'number' && group.sessions_per_week > 0) {
    return group.sessions_per_week;
  }
  const schedule = Array.isArray(group?.schedule) ? group.schedule : [];
  const days = new Set(schedule.map((s) => s?.day).filter(Boolean));
  return days.size || 1;
}

function computeEndDateFromStartAndSessions({ startDate, sessions, sessionsPerWeek }) {
  if (!startDate || !sessions || sessions <= 0) return null;
  const spw = sessionsPerWeek && sessionsPerWeek > 0 ? sessionsPerWeek : 1;
  const weeks = Math.ceil(sessions / spw);
  return addDays(startDate, weeks * 7 - 1);
}

function computeSessionsFromStartAndEnd({ startDate, endDate, sessionsPerWeek }) {
  if (!startDate || !endDate) return null;
  const diff = daysDiff(startDate, endDate);
  if (diff < 0) return null;
  const spw = sessionsPerWeek && sessionsPerWeek > 0 ? sessionsPerWeek : 1;
  const weeks = Math.ceil((diff + 1) / 7);
  const sessions = weeks * spw;
  return sessions <= 0 ? null : sessions;
}

// ----------------------- UI Components -----------------------
function AnimatedCard({ children, delay = 0, style = {} }) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 520,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 520,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return <Animated.View style={[{ transform: [{ translateY }], opacity }, style]}>{children}</Animated.View>;
}

function GradientCard({ children, colors: gradientColors = null, style = {} }) {
  const { colors } = useTheme();
  const surface = colors.surface;
  const border = colors.border;

  const resolvedColors = gradientColors || [surface, alpha(surface, 'EE')];

  return (
    <LinearGradient
      colors={resolvedColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientCard, { borderColor: border }, style]}
    >
      {children}
    </LinearGradient>
  );
}

function PremiumBadge({ text, variant = 'primary', icon: Icon = null }) {
  const { colors } = useTheme();
  const primary = colors.accentOrange;

  const variants = {
    primary: { bg: alpha(primary, '15'), text: primary, border: alpha(primary, '30') },
    success: { bg: alpha(colors.success, '1A'), text: colors.success, border: alpha(colors.success, '40') },
    warning: { bg: alpha(colors.warning, '1A'), text: colors.warning, border: alpha(colors.warning, '40') },
    error: { bg: alpha(colors.error, '1A'), text: colors.error, border: alpha(colors.error, '40') },
  };
  const s = variants[variant] || variants.primary;

  return (
    <View style={[styles.premiumBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
      {Icon && <Icon size={12} color={s.text} style={{ marginRight: 6 }} />}
      <Text style={[styles.premiumBadgeText, { color: s.text }]}>{text}</Text>
    </View>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, colors, tone = 'warning' }) {
  const colorMap = { warning: colors.warning, primary: colors.accentOrange, success: colors.success };
  const iconColor = colorMap[tone] || colors.warning;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.sectionIcon, { backgroundColor: alpha(iconColor, '15'), borderColor: alpha(iconColor, '30') }]}>
          <Icon size={20} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {!!subtitle && (
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

function PremiumDDL({
  label,
  valueLabel,
  placeholder,
  items,
  selectedId,
  onSelect,
  colors,
  icon: Icon = ChevronDown,
  disabled = false,
}) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const selected = useMemo(() => items.find((x) => String(x.id) === String(selectedId)), [items, selectedId]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, damping: 16 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 16 }).start();
  };

  return (
    <>
      <View style={{ gap: 8 }}>
        <Text style={[styles.ddlLabel, { color: colors.textMuted }]}>
          {label}
        </Text>

        <Pressable onPress={() => !disabled && setOpen(true)} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
          <Animated.View
            style={[
              styles.premiumDdl,
              {
                backgroundColor: colors.surfaceElevated || colors.surface,
                borderColor: disabled ? alpha(colors.border, '30') : colors.border,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  styles.ddlValue,
                  { color: selected ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {valueLabel || selected?.label || placeholder}
              </Text>

              {!!selected?.subLabel && (
                <Text style={[styles.ddlSubLabel, { color: colors.textSecondary }]}>
                  {selected.subLabel}
                </Text>
              )}
            </View>

            <Icon size={18} color={disabled ? colors.textMuted : colors.textPrimary} />
          </Animated.View>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
            <View style={[styles.premiumModalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{label}</Text>
                <Pressable onPress={() => setOpen(false)} style={[styles.modalCloseBtn, { backgroundColor: alpha(colors.black, '26') }]}>
                  <X size={20} color={colors.textPrimary} />
                </Pressable>
              </View>

              <FlatList
                data={items}
                keyExtractor={(it) => String(it.id)}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const active = String(item.id) === String(selectedId);
                  return (
                    <Pressable
                      onPress={() => {
                        onSelect(item);
                        setOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.premiumItemRow,
                        {
                          backgroundColor: active
                            ? alpha(colors.accentOrange, '15')
                            : pressed
                              ? alpha(colors.surfaceElevated || colors.surface, 'CC')
                              : (colors.surfaceElevated || colors.surface),
                          borderColor: active ? alpha(colors.accentOrange, '50') : colors.border,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {active && <BadgeCheck size={16} color={colors.accentOrange} />}
                          <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.label}</Text>
                        </View>
                        {!!item.subLabel && (
                          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                            {item.subLabel}
                          </Text>
                        )}
                      </View>
                      {active ? <Check size={20} color={colors.accentOrange} /> : null}
                    </Pressable>
                  );
                }}
              />
            </View>
          </Pressable>
        </BlurView>
      </Modal>
    </>
  );
}

function DatePickerRow({ label, date, onPick, colors, locale, icon: Icon = Calendar, emptyLabel }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, damping: 16 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 16 }).start();

  return (
    <View style={{ gap: 8, flex: 1 }}>
      <Text style={[styles.ddlLabel, { color: colors.textMuted }]}>{label}</Text>
      <Pressable onPress={onPick} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            styles.premiumDateBtn,
            {
              backgroundColor: colors.surfaceElevated || colors.surface,
              borderColor: colors.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
              {date ? formatPrettyDate(date, locale, emptyLabel) : emptyLabel}
            </Text>
            {date && (
              <Text style={[styles.dateSubLabel, { color: colors.textSecondary }]}>
                {toISODate(date)}
              </Text>
            )}
          </View>
          <Icon size={18} color={colors.textPrimary} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function SessionsStepper({ value, onChange, min = 1, max = 999, colors, label, unitLabel }) {
  const handleDecrement = () => onChange(clamp(value - 1, min, max));
  const handleIncrement = () => onChange(clamp(value + 1, min, max));

  return (
    <View style={{ gap: 12 }}>
      <Text style={[styles.ddlLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.premiumStepperContainer}>
        <Pressable onPress={handleDecrement} style={styles.stepperBtn}>
          {({ pressed }) => (
            <View
              style={[
                styles.stepperBtnInner,
                {
                  backgroundColor: pressed ? alpha(colors.accentOrange, '20') : (colors.surfaceElevated || colors.surface),
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.stepperBtnText, { color: colors.textPrimary }]}>−</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.stepperValueContainer}>
          <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>{value}</Text>
          <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>{unitLabel}</Text>
        </View>

        <Pressable onPress={handleIncrement} style={styles.stepperBtn}>
          {({ pressed }) => (
            <View
              style={[
                styles.stepperBtnInner,
                {
                  backgroundColor: pressed ? alpha(colors.accentOrange, '20') : (colors.surfaceElevated || colors.surface),
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.stepperBtnText, { color: colors.textPrimary }]}>+</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ----------------------- Main Screen -----------------------
export function PortalRenewalsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const toast = useToast();
  const { t, locale, isRTL } = useTranslation();
  const placeholder = t('portal.common.placeholder');
  const scheduleSeparator = t('portal.renewals.scheduleSeparator');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fatalError, setFatalError] = useState(null);

  const { overview, overviewLoading, overviewError, renewals, renewalsLoading, renewalsError } = usePlayerPortalStore(
    (state) => ({
      overview: state.overview,
      overviewLoading: state.overviewLoading,
      overviewError: state.overviewError,
      renewals: state.renewals,
      renewalsLoading: state.renewalsLoading,
      renewalsError: state.renewalsError,
    })
  );
  const actions = usePlayerPortalActions();

  // Form state
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sessions, setSessions] = useState(1);
  const [note, setNote] = useState('');
  const [datePicker, setDatePicker] = useState({ open: false, field: null });
  const [submitting, setSubmitting] = useState(false);

  const rawOverview = overview?._raw || overview;
  const eligibility = renewals;
  const registrationInfo = rawOverview?.player_data?.registration_info;

  const availableCoursesRaw = registrationInfo?.available_courses || [];
  const availableGroupsRaw = registrationInfo?.available_groups || [];

  const courses = useMemo(() => {
    return (availableCoursesRaw || []).map((c) => ({
      id: c.id,
      label: c.name || t('portal.renewals.courseLabel', { id: c.id }),
      subLabel:
        c.start_date && c.end_date
          ? t('portal.renewals.courseRange', {
              start: c.start_date,
              end: c.end_date,
              sessions: c.num_of_sessions || 0,
            })
          : t('portal.renewals.courseSessions', { sessions: c.num_of_sessions || 0 }),
      meta: c,
    }));
  }, [availableCoursesRaw, t]);

  const groups = useMemo(() => {
    return (availableGroupsRaw || []).map((g) => {
      const schedule = Array.isArray(g.schedule) ? g.schedule : [];
      const scheduleLabel =
        schedule.length > 0
          ? schedule
              .slice(0, 2)
              .map((s) => `${weekdayLabel(s?.day)} ${s?.time?.start || ''}-${s?.time?.end || ''}`.trim())
              .join(scheduleSeparator)
          : t('portal.renewals.scheduleEmpty');
      return {
        id: g.id,
        label: g.name || t('portal.renewals.groupLabel', { id: g.id }),
        subLabel: g.capacity
          ? t('portal.renewals.groupCapacity', { schedule: scheduleLabel, count: g.capacity })
          : scheduleLabel,
        meta: g,
      };
    });
  }, [availableGroupsRaw, t]);

  const selectedCourse = useMemo(
    () => courses.find((c) => String(c.id) === String(selectedCourseId))?.meta || null,
    [courses, selectedCourseId]
  );
  const selectedGroup = useMemo(
    () => groups.find((g) => String(g.id) === String(selectedGroupId))?.meta || null,
    [groups, selectedGroupId]
  );

  const sessionsPerWeek = useMemo(() => (selectedGroup ? computeSessionsPerWeekFromGroup(selectedGroup) : 1), [selectedGroup]);

const canSubmit = useMemo(() => {
  if (!eligibility?.eligible) return false;
  if (!selectedGroupId) return false;          
  if (!startDate || !endDate) return false;
  if (!sessions || sessions <= 0) return false;
  if (endDate.getTime() < startDate.getTime()) return false;
  return true;
}, [eligibility, selectedGroupId, startDate, endDate, sessions]);


  const fetchAll = useCallback(async () => {
    setFatalError(null);
    try {
      const [ovRes, elRes] = await Promise.all([
        actions.fetchOverview(),
        actions.fetchRenewals(),
      ]);

      if (!ovRes?.success) throw ovRes?.error || new Error('Overview failed');
      if (!elRes?.success) throw elRes?.error || new Error('Eligibility failed');

      const reg = (ovRes.data?._raw || ovRes.data)?.player_data?.registration_info;
      setSelectedCourseId(reg?.course?.id || null);
      setSelectedGroupId(reg?.group?.id || null);
    } catch (e) {
      console.error('Renewals load failed:', e);
      setFatalError(e?.message || 'Failed to load renewals data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actions]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!selectedCourse) return;

    const cStart = parseISODate(selectedCourse?.start_date);
    const cEnd = parseISODate(selectedCourse?.end_date);
    const cSessions = Number(selectedCourse?.num_of_sessions) || 1;

    if (cStart) setStartDate(cStart);
    if (cEnd) setEndDate(cEnd);
    setSessions(cSessions);

    if (!cEnd && cStart) {
      const computed = computeEndDateFromStartAndSessions({
        startDate: cStart,
        sessions: cSessions,
        sessionsPerWeek,
      });
      if (computed) setEndDate(computed);
    }
  }, [selectedCourseId, selectedCourse, sessionsPerWeek]);

  useEffect(() => {
    if (!startDate || !sessions) return;
    const computed = computeEndDateFromStartAndSessions({
      startDate,
      sessions,
      sessionsPerWeek,
    });
    if (computed) setEndDate(computed);
  }, [selectedGroupId, startDate, sessions, sessionsPerWeek]);

  const onChangeStartDate = useCallback(
    (d) => {
      setStartDate(d);
      if (sessions && sessions > 0) {
        const computed = computeEndDateFromStartAndSessions({
          startDate: d,
          sessions,
          sessionsPerWeek,
        });
        if (computed) setEndDate(computed);
      }
    },
    [sessions, sessionsPerWeek]
  );

  const onChangeSessions = useCallback(
    (val) => {
      const maxFromCourse = Number(selectedCourse?.num_of_sessions) || 999;
      const next = clamp(val, 1, maxFromCourse);
      setSessions(next);

      if (startDate) {
        const computed = computeEndDateFromStartAndSessions({
          startDate,
          sessions: next,
          sessionsPerWeek,
        });
        if (computed) setEndDate(computed);
      }
    },
    [startDate, sessionsPerWeek, selectedCourse]
  );

  const onChangeEndDate = useCallback(
    (d) => {
      setEndDate(d);
      if (startDate) {
        const computedSessions = computeSessionsFromStartAndEnd({
          startDate,
          endDate: d,
          sessionsPerWeek,
        });
        if (computedSessions) {
          const maxFromCourse = Number(selectedCourse?.num_of_sessions) || 999;
          setSessions(clamp(computedSessions, 1, maxFromCourse));
        }
      }
    },
    [startDate, sessionsPerWeek, selectedCourse]
  );

  const submit = useCallback(async () => {
    if (!canSubmit) {
      toast?.show?.({ type: 'error', message: t('portal.renewals.errors.completeFields'), duration: 3000 });
      return;
    }

    setSubmitting(true);
    try {
const payload = {
  renew_type: registrationInfo?.registration_type || 'course', // or decide based on UI
  group: Number(selectedGroupId),

  course: selectedCourseId ? Number(selectedCourseId) : null,

  start_date: toISODate(startDate),
  end_date: toISODate(endDate),
  number_of_sessions: Number(sessions),

  player_note: note?.trim() || null,

};


      const res = await actions.submitRenewal(payload);
      if (!res?.success) throw res?.error || new Error('Request failed');

      toast?.show?.({
        type: 'success',
        message: t('portal.renewals.submit.successTitle'),
        description: t('portal.renewals.submit.successMessage'),
        duration: 4000,
      });

      setRefreshing(true);
      await fetchAll();
    } catch (e) {
      toast?.show?.({
        type: 'error',
        message: t('portal.renewals.submit.errorTitle'),
        description: e?.message || t('portal.renewals.submit.errorMessage'),
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    toast,
    t,
    registrationInfo?.id,
    selectedCourseId,
    selectedGroupId,
    startDate,
    endDate,
    sessions,
    note,
    fetchAll,
    actions,
  ]);

  const HeaderRight = useMemo(() => {
    return (
      <Pressable
        onPress={() => {
          setRefreshing(true);
          fetchAll();
        }}
        style={({ pressed }) => [
          styles.headerBtn,
          {
            backgroundColor: pressed ? alpha(colors.accentOrange, '20') : (colors.surfaceElevated || colors.surface),
            borderColor: colors.border,
          },
        ]}
      >
        <RefreshCw size={18} color={colors.textPrimary} />
      </Pressable>
    );
  }, [fetchAll, colors]);

  const topSummary = useMemo(() => {
    const academyName = rawOverview?.academy_name || overview?.academyName || '';
    const player = rawOverview?.player_data?.player_info || {};
    const fullName =
      [player?.first_eng_name, player?.middle_eng_name, player?.last_eng_name].filter(Boolean).join(' ') ||
      [player?.first_ar_name, player?.middle_ar_name, player?.last_ar_name].filter(Boolean).join(' ');

    const endDateIso = eligibility?.end_date || registrationInfo?.end_date || null;
    const end = parseISODate(endDateIso);
    const daysLeft = eligibility?.days_left;

    return { academyName, fullName, end, daysLeft };
  }, [overview, rawOverview, eligibility, registrationInfo?.end_date]);

  if (loading || overviewLoading || renewalsLoading) {
    return (
      <Screen>
        <PortalHeader
          title={t('portal.renewals.title')}
          subtitle={t('portal.renewals.subtitle')}
          right={HeaderRight}
        />
        <SporHiveLoader />
      </Screen>
    );
  }

  if (fatalError || overviewError || renewalsError) {
    return (
      <Screen>
        <PortalHeader
          title={t('portal.renewals.title')}
          subtitle={t('portal.renewals.subtitle')}
          right={HeaderRight}
        />
        <View style={styles.errorContainer}>
          <PortalEmptyState
            icon={AlertCircle}
            title={t('portal.renewals.errors.loadTitle')}
            subtitle={fatalError || overviewError?.message || renewalsError?.message}
            actionLabel={t('portal.renewals.actions.retry')}
            onAction={() => {
              setRefreshing(true);
              fetchAll();
            }}
          />
        </View>
      </Screen>
    );
  }

  const eligible = !!eligibility?.eligible;

  return (
    <PortalAccessGate titleOverride={t('portal.renewals.title')}>
      <Screen>
      <PortalHeader
        title={t('portal.renewals.title')}
        subtitle={t('portal.renewals.subtitle')}
        right={HeaderRight}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isRTL && styles.rtl]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAll();
              }}
              tintColor={colors.accentOrange}
            />
          }
        >
          <AnimatedCard delay={80}>
            <GradientCard style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.playerName, { color: colors.textPrimary }]}>{topSummary.fullName || 'Player'}</Text>
                  {!!topSummary.academyName && (
                    <Text style={[styles.academyName, { color: colors.textSecondary }]}>
                      {topSummary.academyName}
                    </Text>
                  )}
                </View>
                <PremiumBadge
                  text={eligible ? t('portal.renewals.eligible') : t('portal.renewals.notEligible')}
                  variant={eligible ? 'success' : 'warning'}
                  icon={eligible ? ShieldCheck : AlertCircle}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: alpha(colors.border, '30') }]} />

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <CalendarDays size={16} color={colors.textSecondary} />
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('portal.renewals.ends')}</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatPrettyDate(topSummary.end, locale, placeholder)}</Text>
                </View>

                <View style={styles.statItem}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('portal.renewals.daysLeft')}</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {Number.isFinite(Number(topSummary.daysLeft)) ? safeStr(topSummary.daysLeft) : placeholder}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Target size={16} color={colors.textSecondary} />
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('portal.renewals.current')}</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {registrationInfo?.registration_type ? String(registrationInfo.registration_type).toUpperCase() : placeholder}
                  </Text>
                </View>
              </View>

              <Button
                title={t('portal.renewals.viewDetails')}
                onPress={() => router.push('/portal/renewals/details')}
                variant="outline"
                style={{ marginTop: 16 }}
              />
            </GradientCard>
          </AnimatedCard>

          <AnimatedCard delay={160} style={{ marginTop: 16 }}>
            {!eligible ? (
              <GradientCard style={styles.notEligibleCard}>
                <SectionTitle
                  icon={AlertCircle}
                  title={t('portal.renewals.notAvailable.title')}
                  subtitle={t('portal.renewals.notAvailable.subtitle')}
                  colors={colors}
                  tone="warning"
                />

                <View style={styles.reasonsList}>
                  {eligibility?.has_pending_request && (
                    <View style={[styles.reasonItem, { borderColor: colors.border }]}>
                      <View style={[styles.reasonIcon, { backgroundColor: alpha(colors.warning, '15'), borderColor: alpha(colors.warning, '30') }]}>
                        <Clock size={16} color={colors.warning} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.reasonTitle, { color: colors.textPrimary }]}>{t('portal.renewals.notAvailable.pendingTitle')}</Text>
                        <Text style={[styles.reasonBody, { color: colors.textSecondary }]}>
                          {t('portal.renewals.notAvailable.pendingBody')}
                        </Text>
                      </View>
                    </View>
                  )}

                  {Number(topSummary.daysLeft) >= 0 && (
                    <View style={[styles.reasonItem, { borderColor: colors.border }]}>
                      <View style={[styles.reasonIcon, { backgroundColor: alpha(colors.warning, '15'), borderColor: alpha(colors.warning, '30') }]}>
                        <Zap size={16} color={colors.warning} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.reasonTitle, { color: colors.textPrimary }]}>{t('portal.renewals.notAvailable.activeTitle')}</Text>
                        <Text style={[styles.reasonBody, { color: colors.textSecondary }]}>
                          {t('portal.renewals.notAvailable.activeBody')}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <Button title={t('portal.renewals.actions.back')} onPress={() => router.back()} variant="outline" style={{ marginTop: 24 }} />
              </GradientCard>
            ) : (
              <GradientCard>
                <SectionTitle
                  icon={Sparkles}
                  title={t('portal.renewals.request.title')}
                  subtitle={t('portal.renewals.request.subtitle')}
                  colors={colors}
                  tone="primary"
                />

                <View style={styles.formContent}>
                  <PremiumDDL
                    label={t('portal.renewals.request.courseLabel')}
                    placeholder={t('portal.renewals.request.coursePlaceholder')}
                    items={courses}
                    selectedId={selectedCourseId}
                    onSelect={(item) => setSelectedCourseId(item?.id || null)}
                    colors={colors}
                    icon={CalendarDays}
                  />

                  <PremiumDDL
                    label={t('portal.renewals.request.groupLabel')}
                    placeholder={t('portal.renewals.request.groupPlaceholder')}
                    items={groups}
                    selectedId={selectedGroupId}
                    onSelect={(item) => setSelectedGroupId(item?.id || null)}
                    colors={colors}
                    icon={Users}
                  />

                  {selectedGroup && (
                    <View style={[styles.schedulePreview, { backgroundColor: alpha(colors.accentOrange, '10'), borderColor: alpha(colors.accentOrange, '30') }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <CalendarClock size={16} color={colors.accentOrange} />
                        <Text style={[styles.scheduleTitle, { color: colors.accentOrange }]}>{t('portal.renewals.request.scheduleTitle')}</Text>
                      </View>
                      <Text style={[styles.scheduleText, { color: colors.textPrimary }]}>
                        {Array.isArray(selectedGroup?.schedule) && selectedGroup.schedule.length > 0
                          ? selectedGroup.schedule
                              .map((s) => `${weekdayLabel(s?.day)} ${s?.time?.start || ''}-${s?.time?.end || ''}`.trim())
                              .join(scheduleSeparator)
                          : t('portal.renewals.request.scheduleEmpty')}
                      </Text>
                      <Text style={[styles.scheduleNote, { color: colors.textSecondary }]}>
                        {t('portal.renewals.request.sessionsPerWeek', { count: sessionsPerWeek })}
                      </Text>
                    </View>
                  )}

                  <View style={styles.dateGrid}>
                    <DatePickerRow
                      label={t('portal.renewals.request.startDate')}
                      date={startDate}
                      onPick={() => setDatePicker({ open: true, field: 'start' })}
                      colors={colors}
                      locale={locale}
                      icon={Calendar}
                      emptyLabel={t('portal.renewals.request.selectDate')}
                    />
                    <DatePickerRow
                      label={t('portal.renewals.request.endDate')}
                      date={endDate}
                      onPick={() => setDatePicker({ open: true, field: 'end' })}
                      colors={colors}
                      locale={locale}
                      icon={CalendarDays}
                      emptyLabel={t('portal.renewals.request.selectDate')}
                    />
                  </View>

                  <SessionsStepper
                    value={sessions}
                    onChange={onChangeSessions}
                    min={1}
                    max={Number(selectedCourse?.num_of_sessions) || 999}
                    colors={colors}
                    label={t('portal.renewals.request.sessionsLabel')}
                    unitLabel={t('portal.renewals.request.sessionsUnit')}
                  />

                  {startDate && endDate && (
                    <View style={[styles.summaryBox, { backgroundColor: alpha(colors.success, '1A'), borderColor: alpha(colors.success, '40') }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Check size={16} color={colors.success} />
                        <Text style={[styles.summaryTitle, { color: colors.success }]}>{t('portal.renewals.summary.title')}</Text>
                      </View>
                      <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
                        {t('portal.renewals.summary.range', { start: toISODate(startDate), end: toISODate(endDate) })}
                      </Text>
                      <Text style={[styles.summaryDetail, { color: colors.textSecondary }]}>
                        {t('portal.renewals.summary.sessionsDetail', { count: sessions, perWeek: sessionsPerWeek })}
                      </Text>
                    </View>
                  )}

                  <View style={{ gap: 8 }}>
                    <Text style={[styles.ddlLabel, { color: colors.textMuted }]}>
                      {t('portal.renewals.request.notesLabel')}
                    </Text>
                    <Input
                      value={note}
                      onChangeText={setNote}
                      placeholder={t('portal.renewals.request.notesPlaceholder')}
                      multiline
                      numberOfLines={3}
                      style={[
                        styles.noteInput,
                        { backgroundColor: colors.surfaceElevated || colors.surface, borderColor: colors.border },
                      ]}
                    />
                  </View>

                  <Button
                    title={submitting ? t('portal.renewals.actions.submitting') : t('portal.renewals.actions.submit')}
                    onPress={submit}
                    disabled={!canSubmit || submitting}
                    loading={submitting}
                    style={styles.submitButton}
                    gradient
                  />

                  <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
                    {t('portal.renewals.request.disclaimer')}
                  </Text>
                </View>
              </GradientCard>
            )}
          </AnimatedCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {datePicker.open && (
        <Modal transparent animationType="fade" visible={datePicker.open} onRequestClose={() => setDatePicker({ open: false, field: null })}>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
            <Pressable
              style={[styles.datePickerBackdrop, { backgroundColor: alpha(colors.black, '80') }]}
              onPress={() => setDatePicker({ open: false, field: null })}
            >
              <View
                style={[
                  styles.datePickerSheet,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.datePickerHeader}>
                  <Text style={[styles.datePickerTitle, { color: colors.textPrimary }]}>
                    {datePicker.field === 'start'
                      ? t('portal.renewals.datePicker.startTitle')
                      : t('portal.renewals.datePicker.endTitle')}
                  </Text>
                  <Pressable onPress={() => setDatePicker({ open: false, field: null })}>
                    <X size={24} color={colors.textPrimary} />
                  </Pressable>
                </View>

                <DateTimePicker
                  value={datePicker.field === 'start' ? startDate || new Date() : endDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(evt, picked) => {
                    if (Platform.OS !== 'ios') setDatePicker({ open: false, field: null });
                    if (!picked) return;
                    if (datePicker.field === 'start') onChangeStartDate(picked);
                    else onChangeEndDate(picked);
                  }}
                  style={styles.datePicker}
                />

                {Platform.OS === 'ios' && (
                  <Button title={t('portal.renewals.datePicker.confirm')} onPress={() => setDatePicker({ open: false, field: null })} style={{ marginTop: 16 }} />
                )}
              </View>
            </Pressable>
          </BlurView>
        </Modal>
      )}
      </Screen>
    </PortalAccessGate>
  );
}

export default PortalRenewalsScreen;

// ----------------------- Styles -----------------------
const styles = StyleSheet.create({

  errorContainer: { padding: 16 },

  scrollContent: { padding: 16, paddingBottom: 48 },
  rtl: { direction: 'rtl' },

  gradientCard: { borderRadius: 20, padding: 20, borderWidth: 1 },

  summaryCard: { overflow: 'hidden' },

  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  academyName: { fontSize: 14, fontWeight: '500' },

  premiumBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  premiumBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  divider: { height: 1, marginVertical: 16 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statItem: { flex: 1, alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontWeight: '800' },

  notEligibleCard: {},

  reasonsList: { gap: 16, marginTop: 20 },
  reasonItem: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  reasonIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  reasonTitle: { fontSize: 15, fontWeight: '700' },
  reasonBody: { fontSize: 14, lineHeight: 20 },

  formContent: { gap: 20, marginTop: 24 },

  sectionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sectionTitle: { fontSize: 20, fontWeight: '800', flex: 1 },
  sectionSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 4 },

  ddlLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  premiumDdl: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ddlValue: { fontSize: 16, fontWeight: '700' },
  ddlSubLabel: { fontSize: 13, fontWeight: '500' },

  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  premiumModalSheet: { width: '100%', maxHeight: '70%', borderRadius: 24, borderWidth: 1, padding: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  listContainer: { paddingVertical: 4 },
  itemSeparator: { height: 8 },

  premiumItemRow: { padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  itemSubtitle: { fontSize: 13, fontWeight: '500', marginLeft: 24 },

  premiumDateBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateValue: { fontSize: 16, fontWeight: '700' },
  dateSubLabel: { fontSize: 13, fontWeight: '500' },

  premiumStepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  stepperBtn: { borderRadius: 14, overflow: 'hidden' },
  stepperBtnInner: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: 24, fontWeight: '800' },
  stepperValueContainer: { alignItems: 'center', minWidth: 80 },
  stepperValue: { fontSize: 32, fontWeight: '900' },
  stepperLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  dateGrid: { flexDirection: 'row', gap: 16 },

  schedulePreview: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  scheduleTitle: { fontSize: 14, fontWeight: '700' },
  scheduleText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  scheduleNote: { fontSize: 13, fontWeight: '500' },

  summaryBox: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  summaryTitle: { fontSize: 14, fontWeight: '700' },
  summaryText: { fontSize: 16, fontWeight: '800' },
  summaryDetail: { fontSize: 13, fontWeight: '500' },

  noteInput: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  submitButton: { marginTop: 8 },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 12 },

  headerBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  datePickerBackdrop: { flex: 1, justifyContent: 'flex-end' },
  datePickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, maxHeight: '80%' },
  datePickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  datePickerTitle: { fontSize: 20, fontWeight: '800' },
  datePicker: { height: Platform.OS === 'ios' ? 320 : undefined },
});
