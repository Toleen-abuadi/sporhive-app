// src/screens/portal/PortalRenewalsScreen.js
// Fixed:
// - portalApir -> portalApi
// - invalid colors "undefined80" by safe alpha() helper
// - correct RefreshControl usage
// - correct submit API: portalApi.renewalsRequest()
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
  Loader2,
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

import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';

import { portalApi } from '../../services/portal/portal.api';
import { useToast } from '../../components/ui/ToastHost';
import { useTranslation } from '../../services/i18n/i18n';

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

function formatPrettyDate(d, locale) {
  if (!d) return '—';
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
// If base is missing/invalid, returns fallback.
function alpha(base, aHex = '80', fallback = 'rgba(255,255,255,0.5)') {
  if (!base || typeof base !== 'string') return fallback;

  // If already rgba/hsla, just return base (avoid breaking)
  if (base.startsWith('rgba') || base.startsWith('rgb') || base.startsWith('hsla') || base.startsWith('hsl')) {
    return base;
  }

  // Accept #RGB or #RRGGBB
  if (base[0] === '#') {
    const hex = base.replace('#', '');
    if (hex.length === 3) {
      const r = hex[0] + hex[0];
      const g = hex[1] + hex[1];
      const b = hex[2] + hex[2];
      return `#${r}${g}${b}${aHex}`;
    }
    if (hex.length === 6) return `${base}${aHex}`;
    if (hex.length === 8) return base; // already has alpha
  }

  return fallback;
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

function GradientCard({ children, colors = null, style = {} }) {
  const theme = useTheme();
  const surface = theme.colors?.surface || '#111214';
  const border = theme.colors?.border || 'rgba(255,255,255,0.08)';

  const gradientColors = colors || [surface, alpha(surface, 'EE', 'rgba(17,18,20,0.93)')];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientCard, { borderColor: border }, style]}
    >
      {children}
    </LinearGradient>
  );
}

function PremiumBadge({ text, variant = 'primary', icon: Icon = null }) {
  const theme = useTheme();
  const primary = theme.colors?.primary || '#F59E0B';

  const variants = {
    primary: { bg: alpha(primary, '15', 'rgba(245,158,11,0.08)'), text: primary, border: alpha(primary, '30') },
    success: { bg: 'rgba(16,185,129,0.10)', text: '#10B981', border: 'rgba(16,185,129,0.25)' },
    warning: { bg: 'rgba(245,158,11,0.10)', text: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
    error: { bg: 'rgba(239,68,68,0.10)', text: '#EF4444', border: 'rgba(239,68,68,0.25)' },
  };
  const s = variants[variant] || variants.primary;

  return (
    <View style={[styles.premiumBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
      {Icon && <Icon size={12} color={s.text} style={{ marginRight: 6 }} />}
      <Text style={[styles.premiumBadgeText, { color: s.text }]}>{text}</Text>
    </View>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, theme, color = 'warning' }) {
  const primary = theme.colors?.primary || '#F59E0B';
  const success = theme.colors?.success || '#10B981';
  const warning = theme.colors?.warning || '#F59E0B';

  const colorMap = { warning, primary, success };
  const iconColor = colorMap[color] || warning;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.sectionIcon, { backgroundColor: alpha(iconColor, '15'), borderColor: alpha(iconColor, '30') }]}>
          <Icon size={20} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.colors?.text || '#fff' }]}>{title}</Text>
      </View>
      {!!subtitle && (
        <Text style={[styles.sectionSubtitle, { color: alpha(theme.colors?.text || '#fff', 'AA', 'rgba(255,255,255,0.7)') }]}>
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
  theme,
  icon: Icon = ChevronDown,
  disabled = false,
}) {
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
        <Text style={[styles.ddlLabel, { color: alpha(theme.colors?.text || '#fff', 'CC', 'rgba(255,255,255,0.75)') }]}>
          {label}
        </Text>

        <Pressable onPress={() => !disabled && setOpen(true)} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
          <Animated.View
            style={[
              styles.premiumDdl,
              {
                backgroundColor: theme.colors?.card || '#1C1C1E',
                borderColor: disabled ? alpha(theme.colors?.border, '30', 'rgba(255,255,255,0.08)') : (theme.colors?.border || 'rgba(255,255,255,0.10)'),
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  styles.ddlValue,
                  { color: selected ? (theme.colors?.text || '#fff') : alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') },
                ]}
              >
                {valueLabel || selected?.label || placeholder}
              </Text>

              {!!selected?.subLabel && (
                <Text style={[styles.ddlSubLabel, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>
                  {selected.subLabel}
                </Text>
              )}
            </View>

            <Icon size={18} color={disabled ? alpha(theme.colors?.text || '#fff', '50', 'rgba(255,255,255,0.4)') : (theme.colors?.text || '#fff')} />
          </Animated.View>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
            <View style={[styles.premiumModalSheet, { backgroundColor: theme.colors?.surface || '#111214', borderColor: theme.colors?.border || 'rgba(255,255,255,0.10)' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors?.text || '#fff' }]}>{label}</Text>
                <Pressable onPress={() => setOpen(false)} style={styles.modalCloseBtn}>
                  <X size={20} color={theme.colors?.text || '#fff'} />
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
                            ? alpha(theme.colors?.primary || '#F59E0B', '15')
                            : pressed
                              ? alpha(theme.colors?.card || '#1C1C1E', 'CC', 'rgba(28,28,30,0.85)')
                              : (theme.colors?.card || '#1C1C1E'),
                          borderColor: active ? alpha(theme.colors?.primary || '#F59E0B', '50') : (theme.colors?.border || 'rgba(255,255,255,0.10)'),
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {active && <BadgeCheck size={16} color={theme.colors?.primary || '#F59E0B'} />}
                          <Text style={[styles.itemTitle, { color: theme.colors?.text || '#fff' }]}>{item.label}</Text>
                        </View>
                        {!!item.subLabel && (
                          <Text style={[styles.itemSubtitle, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>
                            {item.subLabel}
                          </Text>
                        )}
                      </View>
                      {active ? <Check size={20} color={theme.colors?.primary || '#F59E0B'} /> : null}
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

function DatePickerRow({ label, date, onPick, theme, locale, icon: Icon = Calendar }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, damping: 16 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 16 }).start();

  return (
    <View style={{ gap: 8, flex: 1 }}>
      <Text style={[styles.ddlLabel, { color: alpha(theme.colors?.text || '#fff', 'CC', 'rgba(255,255,255,0.75)') }]}>{label}</Text>
      <Pressable onPress={onPick} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            styles.premiumDateBtn,
            {
              backgroundColor: theme.colors?.card || '#1C1C1E',
              borderColor: theme.colors?.border || 'rgba(255,255,255,0.10)',
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.dateValue, { color: theme.colors?.text || '#fff' }]}>
              {date ? formatPrettyDate(date, locale) : 'Select date'}
            </Text>
            {date && (
              <Text style={[styles.dateSubLabel, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>
                {toISODate(date)}
              </Text>
            )}
          </View>
          <Icon size={18} color={theme.colors?.text || '#fff'} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function SessionsStepper({ value, onChange, min = 1, max = 999, theme, label = 'Number of sessions' }) {
  const handleDecrement = () => onChange(clamp(value - 1, min, max));
  const handleIncrement = () => onChange(clamp(value + 1, min, max));

  return (
    <View style={{ gap: 12 }}>
      <Text style={[styles.ddlLabel, { color: alpha(theme.colors?.text || '#fff', 'CC', 'rgba(255,255,255,0.75)') }]}>{label}</Text>
      <View style={styles.premiumStepperContainer}>
        <Pressable onPress={handleDecrement} style={styles.stepperBtn}>
          {({ pressed }) => (
            <View
              style={[
                styles.stepperBtnInner,
                {
                  backgroundColor: pressed ? alpha(theme.colors?.primary || '#F59E0B', '20') : (theme.colors?.card || '#1C1C1E'),
                  borderColor: theme.colors?.border || 'rgba(255,255,255,0.10)',
                },
              ]}
            >
              <Text style={[styles.stepperBtnText, { color: theme.colors?.text || '#fff' }]}>−</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.stepperValueContainer}>
          <Text style={[styles.stepperValue, { color: theme.colors?.text || '#fff' }]}>{value}</Text>
          <Text style={[styles.stepperLabel, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>sessions</Text>
        </View>

        <Pressable onPress={handleIncrement} style={styles.stepperBtn}>
          {({ pressed }) => (
            <View
              style={[
                styles.stepperBtnInner,
                {
                  backgroundColor: pressed ? alpha(theme.colors?.primary || '#F59E0B', '20') : (theme.colors?.card || '#1C1C1E'),
                  borderColor: theme.colors?.border || 'rgba(255,255,255,0.10)',
                },
              ]}
            >
              <Text style={[styles.stepperBtnText, { color: theme.colors?.text || '#fff' }]}>+</Text>
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
  const theme = useTheme();
  const toast = useToast();
  const { t, locale } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [overview, setOverview] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  const [fatalError, setFatalError] = useState(null);

  // Form state
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sessions, setSessions] = useState(1);
  const [note, setNote] = useState('');
  const [datePicker, setDatePicker] = useState({ open: false, field: null });
  const [submitting, setSubmitting] = useState(false);

  const registrationInfo = overview?.player_data?.registration_info;

  const availableCoursesRaw = registrationInfo?.available_courses || [];
  const availableGroupsRaw = registrationInfo?.available_groups || [];

  const courses = useMemo(() => {
    return (availableCoursesRaw || []).map((c) => ({
      id: c.id,
      label: c.name || `Course #${c.id}`,
      subLabel:
        c.start_date && c.end_date
          ? `${c.start_date} → ${c.end_date} • ${c.num_of_sessions || 0} sessions`
          : `${c.num_of_sessions || 0} sessions`,
      meta: c,
    }));
  }, [availableCoursesRaw]);

  const groups = useMemo(() => {
    return (availableGroupsRaw || []).map((g) => {
      const schedule = Array.isArray(g.schedule) ? g.schedule : [];
      const scheduleLabel =
        schedule.length > 0
          ? schedule
              .slice(0, 2)
              .map((s) => `${weekdayLabel(s?.day)} ${s?.time?.start || ''}-${s?.time?.end || ''}`.trim())
              .join(' • ')
          : 'No schedule';
      return {
        id: g.id,
        label: g.name || `Group #${g.id}`,
        subLabel: `${scheduleLabel}${g.capacity ? ` • ${g.capacity} spots` : ''}`,
        meta: g,
      };
    });
  }, [availableGroupsRaw]);

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
    if (!selectedCourseId && !selectedGroupId) return false;
    if (!startDate || !endDate) return false;
    if (!sessions || sessions <= 0) return false;
    if (endDate.getTime() < startDate.getTime()) return false;
    return true;
  }, [eligibility, selectedCourseId, selectedGroupId, startDate, endDate, sessions]);

  const fetchAll = useCallback(async () => {
    setFatalError(null);
    try {
      const [ovRes, elRes] = await Promise.all([
        portalApi.getOverview(),
        portalApi.renewalsEligibility(),
      ]);

      if (!ovRes?.success) throw ovRes?.error || new Error('Overview failed');
      if (!elRes?.success) throw elRes?.error || new Error('Eligibility failed');

      setOverview(ovRes.data);
      setEligibility(elRes.data?.data || elRes.data);

      const reg = ovRes.data?.player_data?.registration_info;
      setSelectedCourseId(reg?.course?.id || null);
      setSelectedGroupId(reg?.group?.id || null);
    } catch (e) {
      console.error('Renewals load failed:', e);
      setFatalError(e?.message || 'Failed to load renewals data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
      toast?.show?.({ type: 'error', message: 'Please complete all required fields.', duration: 3000 });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reg_id: registrationInfo?.id,
        course: selectedCourseId || null,
        group: selectedGroupId || null,
        start_date: toISODate(startDate),
        end_date: toISODate(endDate),
        number_of_sessions: Number(sessions),
        note: note?.trim() || null,
      };

      const res = await portalApi.renewalsRequest(payload);
      if (!res?.success) throw res?.error || new Error('Request failed');

      toast?.show?.({
        type: 'success',
        message: '🎉 Renewal request submitted!',
        description: 'The academy will review your request shortly.',
        duration: 4000,
      });

      setRefreshing(true);
      await fetchAll();
    } catch (e) {
      toast?.show?.({
        type: 'error',
        message: 'Submission failed',
        description: e?.message || 'Please try again.',
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    toast,
    registrationInfo?.id,
    selectedCourseId,
    selectedGroupId,
    startDate,
    endDate,
    sessions,
    note,
    fetchAll,
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
            backgroundColor: pressed ? alpha(theme.colors?.primary || '#F59E0B', '20') : (theme.colors?.card || '#1C1C1E'),
            borderColor: theme.colors?.border || 'rgba(255,255,255,0.10)',
          },
        ]}
      >
        <RefreshCw size={18} color={theme.colors?.text || '#fff'} />
      </Pressable>
    );
  }, [fetchAll, theme]);

  const topSummary = useMemo(() => {
    const academyName = overview?.academy_name || '';
    const player = overview?.player_data?.player_info || {};
    const fullName =
      [player?.first_eng_name, player?.middle_eng_name, player?.last_eng_name].filter(Boolean).join(' ') ||
      [player?.first_ar_name, player?.middle_ar_name, player?.last_ar_name].filter(Boolean).join(' ');

    const endDateIso = eligibility?.end_date || registrationInfo?.end_date || null;
    const end = parseISODate(endDateIso);
    const daysLeft = eligibility?.days_left;

    return { academyName, fullName, end, daysLeft };
  }, [overview, eligibility, registrationInfo?.end_date]);

  if (loading) {
    return (
      <Screen>
        <PortalHeader
          title={t?.('portal.renewals.title') || 'Renewals'}
          subtitle={t?.('portal.renewals.subtitle') || 'Continue your journey'}
          right={HeaderRight}
        />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <Loader2 size={32} color={theme.colors?.primary || '#F59E0B'} />
            <Text style={[styles.loadingText, { color: theme.colors?.text || '#fff' }]}>Loading renewal options...</Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (fatalError) {
    return (
      <Screen>
        <PortalHeader
          title={t?.('portal.renewals.title') || 'Renewals'}
          subtitle={t?.('portal.renewals.subtitle') || 'Continue your journey'}
          right={HeaderRight}
        />
        <View style={styles.errorContainer}>
          <PortalEmptyState
            icon={AlertCircle}
            title="Couldn't load renewals"
            subtitle={fatalError}
            actionLabel="Try again"
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
    <Screen>
      <PortalHeader
        title={t?.('portal.renewals.title') || 'Renewals'}
        subtitle={t?.('portal.renewals.subtitle') || 'Continue your journey'}
        right={HeaderRight}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAll();
              }}
              tintColor={theme.colors?.text || '#fff'}
            />
          }
        >
          <AnimatedCard delay={80}>
            <GradientCard style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.playerName, { color: theme.colors?.text || '#fff' }]}>{topSummary.fullName || 'Player'}</Text>
                  {!!topSummary.academyName && (
                    <Text style={[styles.academyName, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>
                      {topSummary.academyName}
                    </Text>
                  )}
                </View>
                <PremiumBadge
                  text={eligible ? 'Eligible' : 'Not Eligible'}
                  variant={eligible ? 'success' : 'warning'}
                  icon={eligible ? ShieldCheck : AlertCircle}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: alpha(theme.colors?.border || '#ffffff', '30', 'rgba(255,255,255,0.08)') }]} />

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <CalendarDays size={16} color={alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)')} />
                  <Text style={[styles.statLabel, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>Ends</Text>
                  <Text style={[styles.statValue, { color: theme.colors?.text || '#fff' }]}>{formatPrettyDate(topSummary.end, locale)}</Text>
                </View>

                <View style={styles.statItem}>
                  <Clock size={16} color={alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)')} />
                  <Text style={[styles.statLabel, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>Days Left</Text>
                  <Text style={[styles.statValue, { color: theme.colors?.text || '#fff' }]}>
                    {Number.isFinite(Number(topSummary.daysLeft)) ? safeStr(topSummary.daysLeft) : '—'}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Target size={16} color={alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)')} />
                  <Text style={[styles.statLabel, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>Current</Text>
                  <Text style={[styles.statValue, { color: theme.colors?.text || '#fff' }]}>
                    {registrationInfo?.registration_type ? String(registrationInfo.registration_type).toUpperCase() : '—'}
                  </Text>
                </View>
              </View>
            </GradientCard>
          </AnimatedCard>

          <AnimatedCard delay={160} style={{ marginTop: 16 }}>
            {!eligible ? (
              <GradientCard style={styles.notEligibleCard}>
                <SectionTitle
                  icon={AlertCircle}
                  title="Renewal Not Available"
                  subtitle="Here's why you can't request a renewal right now"
                  theme={theme}
                  color="warning"
                />

                <View style={styles.reasonsList}>
                  {eligibility?.has_pending_request && (
                    <View style={[styles.reasonItem, { borderColor: theme.colors?.border || 'rgba(255,255,255,0.10)' }]}>
                      <View style={[styles.reasonIcon, { backgroundColor: alpha(theme.colors?.warning || '#F59E0B', '15'), borderColor: alpha(theme.colors?.warning || '#F59E0B', '30') }]}>
                        <Clock size={16} color={theme.colors?.warning || '#F59E0B'} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.reasonTitle, { color: theme.colors?.text || '#fff' }]}>Pending Request</Text>
                        <Text style={[styles.reasonBody, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>
                          You already have a renewal request under review. Please wait for it to be processed.
                        </Text>
                      </View>
                    </View>
                  )}

                  {Number(topSummary.daysLeft) >= 0 && (
                    <View style={[styles.reasonItem, { borderColor: theme.colors?.border || 'rgba(255,255,255,0.10)' }]}>
                      <View style={[styles.reasonIcon, { backgroundColor: alpha(theme.colors?.warning || '#F59E0B', '15'), borderColor: alpha(theme.colors?.warning || '#F59E0B', '30') }]}>
                        <Zap size={16} color={theme.colors?.warning || '#F59E0B'} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.reasonTitle, { color: theme.colors?.text || '#fff' }]}>Active Subscription</Text>
                        <Text style={[styles.reasonBody, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>
                          Renewal becomes available closer to your current subscription end date.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <Button title="Back to Dashboard" onPress={() => router.back()} variant="outline" style={{ marginTop: 24 }} />
              </GradientCard>
            ) : (
              <GradientCard>
                <SectionTitle
                  icon={Sparkles}
                  title="Request Renewal"
                  subtitle="Choose your course or group, then set your preferred schedule"
                  theme={theme}
                  color="primary"
                />

                <View style={styles.formContent}>
                  <PremiumDDL
                    label="Select Course (Optional)"
                    placeholder="Choose a course..."
                    items={courses}
                    selectedId={selectedCourseId}
                    onSelect={(item) => setSelectedCourseId(item?.id || null)}
                    theme={theme}
                    icon={CalendarDays}
                  />

                  <PremiumDDL
                    label="Select Group (Optional)"
                    placeholder="Choose a group..."
                    items={groups}
                    selectedId={selectedGroupId}
                    onSelect={(item) => setSelectedGroupId(item?.id || null)}
                    theme={theme}
                    icon={Users}
                  />

                  {selectedGroup && (
                    <View style={[styles.schedulePreview, { backgroundColor: alpha(theme.colors?.primary || '#F59E0B', '10') }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <CalendarClock size={16} color={theme.colors?.primary || '#F59E0B'} />
                        <Text style={[styles.scheduleTitle, { color: theme.colors?.primary || '#F59E0B' }]}>Group Schedule</Text>
                      </View>
                      <Text style={[styles.scheduleText, { color: theme.colors?.text || '#fff' }]}>
                        {Array.isArray(selectedGroup?.schedule) && selectedGroup.schedule.length > 0
                          ? selectedGroup.schedule
                              .map((s) => `${weekdayLabel(s?.day)} ${s?.time?.start || ''}-${s?.time?.end || ''}`.trim())
                              .join(' • ')
                          : 'No schedule set'}
                      </Text>
                      <Text style={[styles.scheduleNote, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>
                        {sessionsPerWeek} session{sessionsPerWeek !== 1 ? 's' : ''} per week
                      </Text>
                    </View>
                  )}

                  <View style={styles.dateGrid}>
                    <DatePickerRow
                      label="Start Date"
                      date={startDate}
                      onPick={() => setDatePicker({ open: true, field: 'start' })}
                      theme={theme}
                      locale={locale}
                      icon={Calendar}
                    />
                    <DatePickerRow
                      label="End Date"
                      date={endDate}
                      onPick={() => setDatePicker({ open: true, field: 'end' })}
                      theme={theme}
                      locale={locale}
                      icon={CalendarDays}
                    />
                  </View>

                  <SessionsStepper
                    value={sessions}
                    onChange={onChangeSessions}
                    min={1}
                    max={Number(selectedCourse?.num_of_sessions) || 999}
                    theme={theme}
                    label="Number of Sessions"
                  />

                  {startDate && endDate && (
                    <View style={[styles.summaryBox, { backgroundColor: 'rgba(16,185,129,0.10)' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Check size={16} color={theme.colors?.success || '#10B981'} />
                        <Text style={[styles.summaryTitle, { color: theme.colors?.success || '#10B981' }]}>Period Summary</Text>
                      </View>
                      <Text style={[styles.summaryText, { color: theme.colors?.text || '#fff' }]}>
                        {toISODate(startDate)} → {toISODate(endDate)}
                      </Text>
                      <Text style={[styles.summaryDetail, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>
                        {sessions} session{sessions !== 1 ? 's' : ''} • {sessionsPerWeek}/week
                      </Text>
                    </View>
                  )}

                  <View style={{ gap: 8 }}>
                    <Text style={[styles.ddlLabel, { color: alpha(theme.colors?.text || '#fff', 'CC', 'rgba(255,255,255,0.75)') }]}>
                      Additional Notes (Optional)
                    </Text>
                    <Input
                      value={note}
                      onChangeText={setNote}
                      placeholder="Any special requests or notes for the academy..."
                      multiline
                      numberOfLines={3}
                      style={[
                        styles.noteInput,
                        { backgroundColor: theme.colors?.card || '#1C1C1E', borderColor: theme.colors?.border || 'rgba(255,255,255,0.10)' },
                      ]}
                    />
                  </View>

                  <Button
                    title={submitting ? 'Submitting...' : 'Submit Renewal Request'}
                    onPress={submit}
                    disabled={!canSubmit || submitting}
                    loading={submitting}
                    style={styles.submitButton}
                    gradient
                  />

                  <Text style={[styles.disclaimer, { color: alpha(theme.colors?.text || '#fff', '80', 'rgba(255,255,255,0.55)') }]}>
                    By submitting, you acknowledge that the academy will review your request. You'll be notified once it's processed.
                  </Text>
                </View>
              </GradientCard>
            )}
          </AnimatedCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {datePicker.open && (
        <Modal transparent animationType="fade" visible={datePicker.open} onRequestClose={() => setDatePicker({ open: false, field: null })}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
            <Pressable style={styles.datePickerBackdrop} onPress={() => setDatePicker({ open: false, field: null })}>
              <View
                style={[
                  styles.datePickerSheet,
                  {
                    backgroundColor: theme.colors?.surface || '#111214',
                    borderColor: theme.colors?.border || 'rgba(255,255,255,0.10)',
                  },
                ]}
              >
                <View style={styles.datePickerHeader}>
                  <Text style={[styles.datePickerTitle, { color: theme.colors?.text || '#fff' }]}>
                    {datePicker.field === 'start' ? 'Select Start Date' : 'Select End Date'}
                  </Text>
                  <Pressable onPress={() => setDatePicker({ open: false, field: null })}>
                    <X size={24} color={theme.colors?.text || '#fff'} />
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
                  <Button title="Confirm Date" onPress={() => setDatePicker({ open: false, field: null })} style={{ marginTop: 16 }} />
                )}
              </View>
            </Pressable>
          </BlurView>
        </Modal>
      )}
    </Screen>
  );
}

export default PortalRenewalsScreen;

// ----------------------- Styles -----------------------
const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingContent: { alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '600', opacity: 0.9 },

  errorContainer: { padding: 16 },

  scrollContent: { padding: 16, paddingBottom: 48 },

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
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
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

  schedulePreview: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8, borderColor: 'rgba(255,255,255,0.08)' },
  scheduleTitle: { fontSize: 14, fontWeight: '700' },
  scheduleText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  scheduleNote: { fontSize: 13, fontWeight: '500' },

  summaryBox: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8, borderColor: 'rgba(255,255,255,0.08)' },
  summaryTitle: { fontSize: 14, fontWeight: '700' },
  summaryText: { fontSize: 16, fontWeight: '800' },
  summaryDetail: { fontSize: 13, fontWeight: '500' },

  noteInput: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  submitButton: { marginTop: 8 },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 12 },

  headerBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  datePickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  datePickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, maxHeight: '80%' },
  datePickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  datePickerTitle: { fontSize: 20, fontWeight: '800' },
  datePicker: { height: Platform.OS === 'ios' ? 320 : undefined },
});
