// src/screens/portal/modals/RequestRenewalDialog.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Crown,
  GraduationCap,
  Target,
  Zap,
} from 'lucide-react-native';

import { PortalModal } from '../../../components/portal/PortalModal';
import { PortalButton, PortalCard, PortalRow, StickyBar } from '../../../components/portal/PortalPrimitives';
import { Field, Input, TextArea } from '../../../components/portal/PortalForm';
import { useToast } from '../../../components/ui/ToastHost';
import { useTranslation } from '../../../services/i18n/i18n';
import { portalApi } from '../../../services/portal/portal.api';
import { usePlayerPortal } from '../../../services/portal/portal.hooks';
import { colors, spacing, radius, typography, alphaBg } from '../../../theme/portal.styles';

const DAY_MAP = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toISO = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const fromISO = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const addMonths = (date, count) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + count);
  return d;
};

const addDays = (date, count) => {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
};

const isISO = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const iso = (value) => {
  if (!value) return '';
  if (isISO(value)) return value;
  return toISO(value);
};

const minISO = (a, b) => {
  if (!a) return b || '';
  if (!b) return a || '';
  return a <= b ? a : b;
};

const maxISO = (a, b) => {
  if (!a) return b || '';
  if (!b) return a || '';
  return a >= b ? a : b;
};

const clampISO = (value, min, max) => {
  if (!value) return value;
  let next = value;
  if (min) next = maxISO(next, min);
  if (max) next = minISO(next, max);
  return next;
};

const sameStr = (a, b) => String(a || '') === String(b || '');

const scheduleDaysFromGroup = (group) => {
  const schedule = Array.isArray(group?.schedule) ? group.schedule : [];
  const days = schedule
    .map((item) => String(item?.day || item?.weekday || item?.label || '').toLowerCase())
    .map((name) => DAY_MAP[name])
    .filter((value) => value != null);
  return new Set(days);
};

const countSessionsInclusive = (startISO, endISO, daysSet) => {
  const start = fromISO(startISO);
  const end = fromISO(endISO);
  if (!start || !end || end < start) return null;
  if (!daysSet || daysSet.size === 0) return null;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (daysSet.has(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

const earliestEndForSessions = (startISO, targetSessions, daysSet, hardEndISO) => {
  const start = fromISO(startISO);
  const hardEnd = fromISO(hardEndISO);
  if (!start || !targetSessions || !daysSet || daysSet.size === 0) return null;

  let count = 0;
  const cursor = new Date(start);
  const maxDays = 720;

  for (let i = 0; i < maxDays; i += 1) {
    if (hardEnd && cursor > hardEnd) return toISO(hardEnd);
    if (daysSet.has(cursor.getDay())) count += 1;
    if (count >= targetSessions) return toISO(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }

  return hardEnd ? toISO(hardEnd) : toISO(cursor);
};

const optionValue = (option) => option?.value ?? option?.id ?? option?.name ?? option?.label ?? option;

const Stepper = ({ steps, currentStep, isRTL }) => (
  <View style={[styles.stepper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
  >
    {steps.map((step, index) => {
      const active = index === currentStep;
      const complete = index < currentStep;
      return (
        <View key={step.key} style={[styles.stepItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <View style={[styles.stepCircle, active && styles.stepCircleActive, complete && styles.stepCircleDone]}>
            {complete ? (
              <CheckCircle2 size={16} color={colors.textInverted} />
            ) : (
              <Text style={styles.stepIndex}>{index + 1}</Text>
            )}
          </View>
          <View style={{ marginHorizontal: spacing.xs }}>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{step.label}</Text>
          </View>
          {index < steps.length - 1 && (
            <View style={[styles.stepDivider, complete && styles.stepDividerActive]} />
          )}
        </View>
      );
    })}
  </View>
);

const CardButton = ({ icon: Icon, title, description, active, onPress, isRTL }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.cardButton,
      active && styles.cardButtonActive,
      pressed && { opacity: 0.9 },
    ]}
  >
    <View style={[styles.cardButtonHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
    >
      <View style={[styles.iconBadge, active && styles.iconBadgeActive]}>
        <Icon size={20} color={active ? colors.textPrimary : colors.textSecondary} />
      </View>
      <Text style={[styles.cardButtonTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
    </View>
    {!!description && (
      <Text style={[styles.cardButtonDesc, { textAlign: isRTL ? 'right' : 'left' }]}>{description}</Text>
    )}
  </Pressable>
);

export const RequestRenewalDialog = ({
  isOpen,
  onClose,
  tryOutId,
  currentReg,
  currentLevel,
  levels = [],
  groupOptions = [],
  courseOptions = [],
}) => {
  const { t, isRTL } = useTranslation();
  const toast = useToast();
  const { refreshOverview } = usePlayerPortal();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [error, setError] = useState('');

  const [renewType, setRenewType] = useState('subscription');
  const [courseId, setCourseId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numSessions, setNumSessions] = useState('');
  const [playerNote, setPlayerNote] = useState('');
  const [level, setLevel] = useState('');
  const [lastEdited, setLastEdited] = useState('none');

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const todayISO = useMemo(() => toISO(new Date()), []);

  const prevStart = iso(currentReg?.start_date || currentReg?.startDate || currentReg?.start_date);
  const prevEnd = iso(currentReg?.end_date || currentReg?.endDate || currentReg?.end_date);
  const prevSessions = Number(currentReg?.number_of_sessions || currentReg?.numberOfSessions || currentReg?.sessions || 0) || '';
  const prevGroupId = currentReg?.group_id || currentReg?.groupId || currentReg?.group?.id || '';

  const anchorStartISO = useMemo(() => {
    if (prevEnd) {
      const next = addDays(fromISO(prevEnd), 1);
      return maxISO(todayISO, toISO(next));
    }
    return todayISO;
  }, [prevEnd, todayISO]);

  const anchorISO = prevEnd || todayISO;

  const selectedCourse = useMemo(
    () => courseOptions.find((course) => sameStr(optionValue(course), courseId)) || null,
    [courseOptions, courseId]
  );

  const selectedGroup = useMemo(
    () => groupOptions.find((group) => sameStr(optionValue(group), groupId)) || null,
    [groupOptions, groupId]
  );

  const filteredCourseOptions = useMemo(() => courseOptions.filter((course) => {
    const start = iso(course?.start_date || course?.startDate);
    const end = iso(course?.end_date || course?.endDate);
    if (!start && !end) return true;
    if (start && end) return (start <= anchorISO && anchorISO <= end) || start >= anchorISO;
    if (start) return start >= anchorISO;
    return true;
  }), [anchorISO, courseOptions]);

  const filteredGroupOptions = useMemo(() => {
    if (renewType === 'course') {
      return groupOptions.filter((group) => sameStr(group?.course_id || group?.courseId, optionValue(selectedCourse)));
    }
    return groupOptions.filter((group) => !group?.course_id && !group?.courseId);
  }, [groupOptions, renewType, selectedCourse]);

  const sessionsCap = useMemo(() => {
    if (renewType === 'course') {
      const courseSessions = Number(selectedCourse?.num_of_sessions || selectedCourse?.numSessions || 0);
      return courseSessions > 0 ? courseSessions : 365;
    }
    return 365;
  }, [renewType, selectedCourse]);

  const trainingDays = useMemo(() => scheduleDaysFromGroup(selectedGroup), [selectedGroup]);

  const startMin = useMemo(() => {
    if (renewType === 'course' && selectedCourse) {
      return maxISO(anchorStartISO, iso(selectedCourse?.start_date || selectedCourse?.startDate));
    }
    return anchorStartISO;
  }, [anchorStartISO, renewType, selectedCourse]);

  const startMax = useMemo(() => {
    if (renewType === 'course' && selectedCourse) {
      return iso(selectedCourse?.end_date || selectedCourse?.endDate);
    }
    return '';
  }, [renewType, selectedCourse]);

  const endMin = useMemo(() => startDate || startMin, [startDate, startMin]);

  const endMax = useMemo(() => {
    if (renewType === 'course' && selectedCourse) {
      return iso(selectedCourse?.end_date || selectedCourse?.endDate);
    }
    return '';
  }, [renewType, selectedCourse]);

  const levelOptions = useMemo(() => levels.map((lvl) => ({
    value: optionValue(lvl),
    label: lvl?.label || lvl?.name || lvl?.title || String(lvl),
  })), [levels]);

  const isLevelValid = useMemo(() => levelOptions.some((opt) => sameStr(opt.value, level)), [level, levelOptions]);

  const canProceedStep1 = isLevelValid && !!groupId && (renewType === 'subscription' || !!courseId);

  const sessionsValue = Number(numSessions);
  const validSessions = Number.isFinite(sessionsValue) && sessionsValue >= 1 && sessionsValue <= sessionsCap;
  const validDates = !!startDate && !!endDate && startDate <= endDate;
  const canProceedStep2 = validDates && validSessions && isLevelValid;

  const canSubmit = canProceedStep1 && canProceedStep2;

  const steps = useMemo(
    () => [
      { key: 'type', label: t('player.renewal.step1Title') || 'Type' },
      { key: 'selection', label: t('player.renewal.step2Title') || 'Selection' },
      { key: 'dates', label: t('player.renewal.step3Title') || 'Dates' },
      { key: 'confirm', label: t('player.renewal.step4Title') || 'Confirm' },
    ],
    [t]
  );

  const resetForm = useCallback(() => {
    const initialLevel = currentLevel || levelOptions[0]?.value || '';
    const initialCourseId = currentReg?.course_id || currentReg?.courseId || '';
    const initialGroupId = prevGroupId || '';
    const initialSessions = prevSessions || 1;

    setStep(0);
    setLoading(false);
    setError('');
    setRenewType('subscription');
    setCourseId(initialCourseId ? String(initialCourseId) : '');
    setGroupId(initialGroupId ? String(initialGroupId) : '');
    setStartDate(anchorStartISO);
    setEndDate('');
    setNumSessions(String(initialSessions));
    setPlayerNote('');
    setLevel(initialLevel ? String(initialLevel) : '');
    setLastEdited('none');
  }, [anchorStartISO, currentLevel, currentReg, levelOptions, prevSessions]);

  useEffect(() => {
    if (!isOpen) return;
    resetForm();
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen) return;
    if (lastEdited !== 'none') return;
    const nextSessions = Number(numSessions) || 1;
    const nextEnd = earliestEndForSessions(startDate || startMin, nextSessions, trainingDays, endMax || null);
    if (nextEnd && nextEnd !== endDate) {
      setEndDate(nextEnd);
    }
  }, [endDate, endMax, isOpen, lastEdited, numSessions, startDate, startMin, trainingDays]);

  useEffect(() => {
    if (!isOpen) return;
    if (groupId && !filteredGroupOptions.some((group) => sameStr(optionValue(group), groupId))) {
      setGroupId('');
    }
  }, [filteredGroupOptions, groupId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!startDate) return;

    let nextStart = clampISO(startDate, startMin, startMax);
    let nextEnd = endDate;

    if (nextStart !== startDate) setStartDate(nextStart);
    if (nextEnd) {
      nextEnd = clampISO(nextEnd, nextStart, endMax);
      if (nextEnd !== endDate) setEndDate(nextEnd);
    }
  }, [endMax, endDate, isOpen, startDate, startMax, startMin]);

  const checkEligibility = useCallback(async () => {
    if (!tryOutId) {
      const message = t('player.renewal.missingTryOut') || 'Missing try-out information.';
      toast?.error?.(t('player.renewal.notEligibleTitle') || 'Renewal unavailable', { message });
      onClose?.(false, message);
      return false;
    }
    setCheckingEligibility(true);
    try {
      const res = await portalApi.renewalsEligibility({ try_out: Number(tryOutId) });
      if (!res?.success) throw res?.error || new Error('Not eligible');
      return true;
    } catch (err) {
      const message = err?.message || t('player.renewal.notEligible') || 'Not eligible for renewal.';
      toast?.error?.(t('player.renewal.notEligibleTitle') || 'Renewal unavailable', { message });
      onClose?.(false, message);
      return false;
    } finally {
      setCheckingEligibility(false);
    }
  }, [onClose, t, toast, tryOutId]);

  useEffect(() => {
    if (!isOpen) return;
    checkEligibility();
  }, [checkEligibility, isOpen]);

  const handleStartChange = useCallback((value) => {
    const nextStart = clampISO(value, startMin, startMax) || startMin;
    const nextSessions = clamp(Number(numSessions) || 1, 1, sessionsCap);
    const nextEnd = earliestEndForSessions(nextStart, nextSessions, trainingDays, endMax || null);

    setStartDate(nextStart);
    setNumSessions(String(nextSessions));
    if (nextEnd) setEndDate(nextEnd);
    setLastEdited('start');
  }, [endMax, numSessions, sessionsCap, startMax, startMin, trainingDays]);

  const handleEndChange = useCallback((value) => {
    const nextEnd = clampISO(value, endMin, endMax) || endMin;
    const nextSessions = countSessionsInclusive(startDate || startMin, nextEnd, trainingDays);
    setEndDate(nextEnd);
    if (nextSessions != null) {
      setNumSessions(String(clamp(nextSessions, 1, sessionsCap)));
    }
    setLastEdited('end');
  }, [endMax, endMin, sessionsCap, startDate, startMin, trainingDays]);

  const handleSessionsChange = useCallback((value) => {
    const clean = String(value || '').replace(/[^\d]/g, '');
    const nextSessions = clamp(Number(clean) || 1, 1, sessionsCap);
    const seedStart = startDate || startMin;
    const nextEnd = earliestEndForSessions(seedStart, nextSessions, trainingDays, endMax || null);

    setStartDate(seedStart);
    setNumSessions(String(nextSessions));
    if (nextEnd) setEndDate(nextEnd);
    setLastEdited('sessions');
  }, [endMax, sessionsCap, startDate, startMin, trainingDays]);

  const handleNext = useCallback(() => {
    setError('');
    if (step === 1 && !canProceedStep1) {
      setError(t('player.renewal.step2Error') || 'Please complete the required fields.');
      return;
    }
    if (step === 2 && !canProceedStep2) {
      setError(t('player.renewal.step3Error') || 'Please provide valid dates and sessions.');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
  }, [canProceedStep1, canProceedStep2, step, t]);

  const handleBack = useCallback(() => setStep((prev) => Math.max(prev - 1, 0)), []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError('');
    const toastId = toast?.push?.({
      variant: 'loading',
      title: t('player.renewal.submitting') || 'Submitting',
      description: t('player.renewal.pleaseWait') || 'Please wait while we submit your request.',
      duration: 0,
    });

    try {
      const payload = {
        try_out: Number(tryOutId),
        current_reg: currentReg?.id || null,
        renew_type: renewType,
        course: renewType === 'course' ? Number(courseId) : null,
        group: Number(groupId),
        start_date: startDate || null,
        end_date: endDate || null,
        number_of_sessions: Number(numSessions),
        level: level || null,
        player_note: playerNote || null,
      };

      const res = await portalApi.renewalsRequest(payload);
      if (!res?.success) throw res?.error || new Error('Request failed');

      toast?.update?.(toastId, {
        variant: 'success',
        title: t('player.renewal.submitted') || 'Renewal submitted',
        description: t('player.renewal.submittedDesc') || 'Your renewal request has been sent.',
        duration: 3200,
      });
      await refreshOverview?.();
      onClose?.(true);
    } catch (err) {
      const message = err?.message || t('player.renewal.submitFailed') || 'Failed to submit renewal.';
      toast?.update?.(toastId, {
        variant: 'error',
        title: t('player.renewal.submitFailed') || 'Submission failed',
        description: message,
        duration: 3200,
      });
      onClose?.(false, message);
    } finally {
      setLoading(false);
    }
  }, [canSubmit, courseId, currentReg?.id, endDate, groupId, level, loading, numSessions, onClose, playerNote, refreshOverview, renewType, startDate, t, toast, tryOutId]);

  const summaryRows = [
    { label: t('player.renewal.summaryType') || 'Type', value: renewType },
    { label: t('player.renewal.summaryCourse') || 'Course', value: selectedCourse?.label || selectedCourse?.name || '—' },
    { label: t('player.renewal.summaryGroup') || 'Group', value: selectedGroup?.label || selectedGroup?.name || '—' },
    { label: t('player.renewal.summaryStart') || 'Start date', value: startDate || '—' },
    { label: t('player.renewal.summaryEnd') || 'End date', value: endDate || '—' },
    { label: t('player.renewal.summarySessions') || 'Sessions', value: numSessions || '—' },
    { label: t('player.renewal.summaryLevel') || 'Level', value: level || '—' },
  ];

  return (
    <PortalModal
      visible={isOpen}
      title={t('player.renewal.title') || 'Request Renewal'}
      subtitle={t('player.renewal.subtitle') || `Step ${step + 1} of 4`}
      onClose={loading ? null : onClose}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <Stepper steps={steps} currentStep={step} isRTL={isRTL} />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {step === 0 && (
          <Animated.View entering={FadeInUp} exiting={FadeOutDown}>
            <PortalCard
              title={t('player.renewal.step1Heading') || 'Choose renewal type'}
              subtitle={t('player.renewal.step1Sub') || 'Select how you want to renew your subscription.'}
            >
              <View style={{ gap: spacing.md }}>
                <CardButton
                  icon={Zap}
                  title={t('player.renewal.subscription') || 'Subscription'}
                  description={t('player.renewal.subscriptionDesc') || 'Continue with a flexible subscription plan.'}
                  active={renewType === 'subscription'}
                  onPress={() => {
                    setRenewType('subscription');
                    setCourseId('');
                    setGroupId('');
                  }}
                  isRTL={isRTL}
                />
                <CardButton
                  icon={Crown}
                  title={t('player.renewal.course') || 'Course'}
                  description={t('player.renewal.courseDesc') || 'Renew by choosing a specific course schedule.'}
                  active={renewType === 'course'}
                  onPress={() => {
                    setRenewType('course');
                    setCourseId('');
                    setGroupId('');
                  }}
                  isRTL={isRTL}
                />
              </View>
            </PortalCard>

            <PortalCard
              title={t('player.renewal.currentTitle') || 'Current subscription'}
              subtitle={t('player.renewal.currentSub') || 'Here is your current subscription summary.'}
              style={{ marginTop: spacing.md }}
            >
              <PortalRow
                title={t('player.renewal.currentType') || 'Type'}
                value={currentReg?.registration_type || currentReg?.type || '—'}
              />
              <PortalRow
                title={t('player.renewal.currentCourse') || 'Course'}
                value={currentReg?.course_name || currentReg?.course?.name || '—'}
              />
              <PortalRow title={t('player.renewal.currentStart') || 'Start'} value={prevStart || '—'} />
              <PortalRow title={t('player.renewal.currentEnd') || 'End'} value={prevEnd || '—'} />
              <PortalRow
                title={t('player.renewal.currentSessions') || 'Sessions'}
                value={prevSessions || '—'}
              />
              <PortalRow title={t('player.renewal.currentLevel') || 'Level'} value={currentLevel || '—'} />
            </PortalCard>
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View entering={FadeInUp} exiting={FadeOutDown}>
            <PortalCard
              title={t('player.renewal.step2Heading') || 'Select level and group'}
              subtitle={t('player.renewal.step2Sub') || 'Choose your training level and group.'}
            >
              <Field label={t('player.renewal.levelLabel') || 'Level'}>
                <View style={styles.optionWrap}>
                  {levelOptions.map((option) => (
                    <Pressable
                      key={String(option.value)}
                      onPress={() => setLevel(String(option.value))}
                      style={({ pressed }) => [
                        styles.optionChip,
                        sameStr(option.value, level) && styles.optionChipActive,
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text style={styles.optionChipText}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>

              {renewType === 'course' && (
                <Field label={t('player.renewal.courseLabel') || 'Course'}>
                  <View style={{ gap: spacing.sm }}>
                    {filteredCourseOptions.map((course) => (
                      <Pressable
                        key={String(optionValue(course))}
                        onPress={() => {
                          setCourseId(String(optionValue(course)));
                          setGroupId('');
                        }}
                        style={({ pressed }) => [
                          styles.optionCard,
                          sameStr(optionValue(course), courseId) && styles.optionCardActive,
                          pressed && { opacity: 0.9 },
                        ]}
                      >
                        <View style={styles.optionCardHeader}>
                          <GraduationCap size={18} color={colors.textSecondary} />
                          <Text style={styles.optionCardTitle}>{course.label || course.name}</Text>
                        </View>
                        <Text style={styles.optionCardDesc}>
                          {iso(course?.start_date || course?.startDate)}
                          {course?.end_date || course?.endDate ? ` → ${iso(course?.end_date || course?.endDate)}` : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Field>
              )}

              <Field label={t('player.renewal.groupLabel') || 'Group'}>
                <View style={{ gap: spacing.sm }}>
                  {filteredGroupOptions.map((group) => (
                    <Pressable
                      key={String(optionValue(group))}
                      onPress={() => setGroupId(String(optionValue(group)))}
                      style={({ pressed }) => [
                        styles.optionCard,
                        sameStr(optionValue(group), groupId) && styles.optionCardActive,
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <View style={styles.optionCardHeader}>
                        <Target size={18} color={colors.textSecondary} />
                        <Text style={styles.optionCardTitle}>{group.label || group.name}</Text>
                      </View>
                      {!!group?.schedule?.length && (
                        <Text style={styles.optionCardDesc}>
                          {group.schedule.map((s) => s.label || `${s.day} ${s.time || ''}`).join(', ')}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </Field>
            </PortalCard>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeInUp} exiting={FadeOutDown}>
            <PortalCard
              title={t('player.renewal.step3Heading') || 'Dates and sessions'}
              subtitle={t('player.renewal.step3Sub') || 'Pick the schedule that works for you.'}
            >
              <Field label={t('player.renewal.startDate') || 'Start date'}>
                <Pressable
                  onPress={() => setShowStartPicker(true)}
                  style={({ pressed }) => [styles.dateButton, pressed && { opacity: 0.9 }]}
                >
                  <CalendarDays size={18} color={colors.textSecondary} />
                  <Text style={styles.dateText}>{startDate || startMin || todayISO}</Text>
                </Pressable>
                {showStartPicker && (
                  <DateTimePicker
                    value={fromISO(startDate) || fromISO(startMin) || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={fromISO(startMin) || undefined}
                    maximumDate={fromISO(startMax) || undefined}
                    onChange={(_, date) => {
                      if (Platform.OS !== 'ios') setShowStartPicker(false);
                      if (date) handleStartChange(toISO(date));
                    }}
                  />
                )}
                {Platform.OS === 'ios' && showStartPicker ? (
                  <PortalButton
                    title={t('player.renewal.done') || 'Done'}
                    tone="secondary"
                    onPress={() => setShowStartPicker(false)}
                    style={{ marginTop: spacing.sm }}
                  />
                ) : null}
              </Field>

              <Field label={t('player.renewal.endDate') || 'End date'}>
                <Pressable
                  onPress={() => setShowEndPicker(true)}
                  style={({ pressed }) => [styles.dateButton, pressed && { opacity: 0.9 }]}
                >
                  <CalendarDays size={18} color={colors.textSecondary} />
                  <Text style={styles.dateText}>{endDate || endMin || todayISO}</Text>
                </Pressable>
                {showEndPicker && (
                  <DateTimePicker
                    value={fromISO(endDate) || fromISO(endMin) || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={fromISO(endMin) || undefined}
                    maximumDate={fromISO(endMax) || undefined}
                    onChange={(_, date) => {
                      if (Platform.OS !== 'ios') setShowEndPicker(false);
                      if (date) handleEndChange(toISO(date));
                    }}
                  />
                )}
                {Platform.OS === 'ios' && showEndPicker ? (
                  <PortalButton
                    title={t('player.renewal.done') || 'Done'}
                    tone="secondary"
                    onPress={() => setShowEndPicker(false)}
                    style={{ marginTop: spacing.sm }}
                  />
                ) : null}
              </Field>

              <Field
                label={t('player.renewal.sessionsLabel') || 'Number of sessions'}
                hint={`${t('player.renewal.sessionsCap') || 'Max'}: ${sessionsCap}`}
              >
                <Input
                  value={String(numSessions)}
                  onChangeText={handleSessionsChange}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </Field>

              {!isLevelValid && (
                <Field label={t('player.renewal.levelLabel') || 'Level'}>
                  <Input
                    value={level}
                    onChangeText={setLevel}
                    placeholder={t('player.renewal.levelPlaceholder') || 'Select a level'}
                  />
                </Field>
              )}
            </PortalCard>
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={FadeInUp} exiting={FadeOutDown}>
            <PortalCard
              title={t('player.renewal.step4Heading') || 'Confirm renewal'}
              subtitle={t('player.renewal.step4Sub') || 'Review your request before submitting.'}
            >
              {summaryRows.map((row) => (
                <PortalRow key={row.label} title={row.label} value={row.value} />
              ))}

              <Field label={t('player.renewal.noteLabel') || 'Player note'}>
                <TextArea
                  value={playerNote}
                  onChangeText={setPlayerNote}
                  placeholder={t('player.renewal.notePlaceholder') || 'Add a note for the academy (optional)'}
                />
              </Field>
            </PortalCard>
          </Animated.View>
        )}
      </ScrollView>

      <StickyBar>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: spacing.sm }}>
          {step > 0 ? (
            <View style={{ flex: 1 }}>
              <PortalButton
                title={t('player.renewal.back') || 'Back'}
                tone="secondary"
                onPress={handleBack}
                disabled={loading || checkingEligibility}
              />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {step < 3 ? (
              <PortalButton
                title={t('player.renewal.next') || 'Next'}
                onPress={handleNext}
                disabled={loading || checkingEligibility || (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
              />
            ) : (
              <PortalButton
                title={loading ? t('player.renewal.submitting') || 'Submitting…' : t('player.renewal.submit') || 'Submit'}
                onPress={handleSubmit}
                disabled={loading || checkingEligibility || !canSubmit}
              />
            )}
          </View>
        </View>
      </StickyBar>
    </PortalModal>
  );
};

const styles = StyleSheet.create({
  stepper: {
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stepItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  stepCircleActive: {
    borderColor: colors.primary,
  },
  stepCircleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepIndex: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  stepLabel: {
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  stepLabelActive: {
    color: colors.textPrimary,
  },
  stepDivider: {
    width: 28,
    height: 2,
    backgroundColor: colors.borderMedium,
    marginHorizontal: spacing.xs,
  },
  stepDividerActive: {
    backgroundColor: colors.primary,
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  cardButton: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.backgroundElevated,
  },
  cardButtonActive: {
    borderColor: colors.primary,
    backgroundColor: alphaBg(colors.primary, 0.16),
  },
  cardButtonHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundCard,
  },
  iconBadgeActive: {
    borderColor: colors.primary,
    backgroundColor: alphaBg(colors.primary, 0.25),
  },
  cardButtonTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.base,
  },
  cardButtonDesc: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
    lineHeight: typography.sizes.sm * 1.4,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.backgroundElevated,
  },
  optionChipActive: {
    borderColor: colors.primary,
    backgroundColor: alphaBg(colors.primary, 0.18),
  },
  optionChipText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  optionCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.backgroundElevated,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: alphaBg(colors.primary, 0.16),
  },
  optionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionCardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.base,
  },
  optionCardDesc: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
  },
  dateButton: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    color: colors.textPrimary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.base,
  },
});
