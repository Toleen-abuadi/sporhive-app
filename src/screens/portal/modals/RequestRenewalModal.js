// src/screens/portal/modals/RequestRenewalModal.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { portalApi } from '../../../services/portal/portal.api';
import { usePortal } from '../../../services/portal/portal.hooks';
import { formatDate } from '../../../services/portal/portal.normalize';
import { useToast } from '../../../components/ui/ToastHost';

import { PortalModal } from '../../../components/portal/PortalModal';
import { PortalButton, PortalCard, InlineError, StickyBar, PortalRow, Pill } from '../../../components/portal/PortalPrimitives';
import { Field, Input, TextArea, Segmented } from '../../../components/portal/PortalForm';
import { colors, spacing, radius, typography, alphaBg } from '../../../theme/portal.styles';

const toISO = (d) => {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseISO = (s) => {
  if (!s) return null;
  const x = new Date(s);
  return Number.isNaN(x.getTime()) ? null : x;
};

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

const countSessionsBetween = (startDate, endDate, schedule = []) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!start || !end || end < start) return null;
  const days = schedule
    .map((s) => String(s?.day || '').toLowerCase())
    .map((name) => DAY_MAP[name])
    .filter((d) => d != null);
  if (!days.length) return null;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (days.includes(cur.getDay())) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

export const RequestRenewalModal = ({ visible, onClose }) => {
  const { overview, refresh } = usePortal();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    renewType: 'subscription',
    levelId: null,
    courseId: null,
    groupId: null,
    startDate: '',
    endDate: '',
    sessions: '',
    note: '',
  });
  const tryOutId = overview?.raw?.registration_info?.try_out_id || overview?.raw?.registration_info?.try_out || null;

  const courses = overview?.available?.courses || [];
  const groups = overview?.available?.groups || [];
  const levels = overview?.levels || [];

  const selectedCourse = courses.find((c) => String(c.id) === String(form.courseId));
  const selectedGroup = groups.find((g) => String(g.id) === String(form.groupId));

  const filteredGroups = useMemo(() => {
    if (form.renewType !== 'course' || !form.courseId) return groups;
    return groups.filter((g) => String(g.courseId) === String(form.courseId));
  }, [form.courseId, form.renewType, groups]);

  const clampDates = useCallback((nextForm) => {
    const prevEnd = overview?.registration?.endDate;
    const minStart = new Date();
    if (prevEnd) {
      const end = new Date(prevEnd);
      if (!Number.isNaN(end.getTime())) {
        end.setDate(end.getDate() + 1);
        if (end > minStart) minStart.setTime(end.getTime());
      }
    }

    let startDate = nextForm.startDate;
    let endDate = nextForm.endDate;

    if (startDate) {
      const start = parseISO(startDate);
      if (start && start < minStart) startDate = toISO(minStart);
    }

    if (nextForm.renewType === 'course' && selectedCourse) {
      const courseStart = parseISO(selectedCourse.startDate);
      const courseEnd = parseISO(selectedCourse.endDate);
      if (courseStart) {
        const nextStart = parseISO(startDate);
        if (!nextStart || nextStart < courseStart) startDate = toISO(courseStart);
      }
      if (courseEnd && endDate) {
        const nextEnd = parseISO(endDate);
        if (nextEnd && nextEnd > courseEnd) endDate = toISO(courseEnd);
      }
    }

    return { ...nextForm, startDate, endDate };
  }, [overview?.registration?.endDate, selectedCourse]);

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    setError('');
    setForm({
      renewType: 'subscription',
      levelId: null,
      courseId: null,
      groupId: null,
      startDate: '',
      endDate: '',
      sessions: '',
      note: '',
    });
  }, [visible]);

  useEffect(() => {
    if (!form.startDate || !form.endDate) return;
    const computed = countSessionsBetween(form.startDate, form.endDate, selectedGroup?.schedule || []);
    if (computed != null) {
      setForm((prev) => ({ ...prev, sessions: String(computed) }));
    }
  }, [form.startDate, form.endDate, selectedGroup?.schedule]);

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!form.groupId) {
        setError('Please select a group.');
        return;
      }
      if (form.renewType === 'course' && !form.courseId) {
        setError('Please select a course.');
        return;
      }
    }
    if (step === 2) {
      if (!form.startDate || !form.endDate) {
        setError('Please select start and end dates.');
        return;
      }
      const start = parseISO(form.startDate);
      const end = parseISO(form.endDate);
      if (start && end && end < start) {
        setError('End date must be after start date.');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = {
        renew_type: form.renewType,
        level_id: form.levelId ? Number(form.levelId) : null,
        level: form.levelId ? Number(form.levelId) : null,
        course_id: form.courseId ? Number(form.courseId) : null,
        course: form.courseId ? Number(form.courseId) : null,
        group_id: form.groupId ? Number(form.groupId) : null,
        group: form.groupId ? Number(form.groupId) : null,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        number_of_sessions: form.sessions ? Number(form.sessions) : null,
        player_note: form.note ? String(form.note) : null,
        registration_id: overview?.registration?.id || null,
        try_out: tryOutId ? Number(tryOutId) : null,
      };

      const res = await portalApi.requestRenewal(payload);
      if (!res?.success) throw res?.error || new Error('Request failed');

      toast?.success?.('Renewal request submitted', {
        message: 'Your renewal request has been sent to the academy.',
      });
      await refresh();
      onClose?.();
    } catch (err) {
      const msg = err?.message || 'Failed to submit renewal request.';
      setError(msg);
      toast?.error?.('Renewal failed', { message: msg });
    } finally {
      setBusy(false);
    }
  };

  const stepTitle = ['Type', 'Selection', 'Dates', 'Review'][step];

  return (
    <PortalModal
      visible={visible}
      title="Request Renewal"
      subtitle={`Step ${step + 1} of 4 • ${stepTitle}`}
      onClose={busy ? null : onClose}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {!!error && <InlineError text={error} />}

        {step === 0 && (
          <PortalCard title="Renewal type" subtitle="Choose subscription or course renewal.">
            <Segmented
              value={form.renewType}
              onChange={(v) => setForm((prev) => ({ ...prev, renewType: v, courseId: null, groupId: null }))}
              options={[
                { value: 'subscription', label: 'Subscription' },
                { value: 'course', label: 'Course' },
              ]}
            />
          </PortalCard>
        )}

        {step === 1 && (
          <PortalCard title="Select level, course, and group" subtitle="Pick the best matching option.">
            {!!levels.length && (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.sectionLabel}>Levels</Text>
                <View style={styles.wrapRow}>
                  {levels.map((lvl) => (
                    <Pressable
                      key={String(lvl?.id || lvl)}
                      onPress={() => setForm((prev) => ({ ...prev, levelId: lvl?.id || lvl }))}
                      style={({ pressed }) => [styles.selectChip, form.levelId === (lvl?.id || lvl) && styles.selectChipActive, pressed && { opacity: 0.9 }]}
                    >
                      <Text style={styles.selectChipText}>{lvl?.name || lvl?.label || lvl?.title || String(lvl)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {form.renewType === 'course' && (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.sectionLabel}>Courses</Text>
                {courses.length ? (
                  courses.map((course) => (
                    <PortalRow
                      key={String(course.id)}
                      title={course.name || 'Course'}
                      value={course.startDate && course.endDate ? `${formatDate(course.startDate)} → ${formatDate(course.endDate)}` : '—'}
                      onPress={() => setForm((prev) => ({ ...prev, courseId: course.id, groupId: null }))}
                      right={form.courseId === course.id ? <Pill label="Selected" tone="success" small /> : null}
                    />
                  ))
                ) : (
                  <Text style={styles.muted}>No courses available.</Text>
                )}
              </View>
            )}

            <Text style={styles.sectionLabel}>Groups</Text>
            {filteredGroups.length ? (
              filteredGroups.map((group) => (
                <PortalRow
                  key={String(group.id)}
                  title={group.name || 'Group'}
                  value={group.schedule?.length ? group.schedule.map((s) => s.label || `${s.day} ${s.time}`).join(', ') : 'Schedule not available'}
                  onPress={() => setForm((prev) => ({ ...prev, groupId: group.id }))}
                  right={form.groupId === group.id ? <Pill label="Selected" tone="success" small /> : null}
                />
              ))
            ) : (
              <Text style={styles.muted}>No groups available.</Text>
            )}
          </PortalCard>
        )}

        {step === 2 && (
          <PortalCard title="Dates & sessions" subtitle="Pick your renewal dates and sessions.">
            <Field label="Start date">
              <Pressable
                onPress={() => setForm((prev) => ({ ...prev, _pickStart: true }))}
                style={({ pressed }) => [styles.dateBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.dateText}>{form.startDate || 'Pick a date'}</Text>
              </Pressable>
              {form._pickStart ? (
                <DateTimePicker
                  value={parseISO(form.startDate) || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    if (Platform.OS !== 'ios') setForm((prev) => ({ ...prev, _pickStart: false }));
                    if (d) setForm((prev) => clampDates({ ...prev, startDate: toISO(d), _pickStart: Platform.OS === 'ios' }));
                  }}
                />
              ) : null}
              {Platform.OS === 'ios' && form._pickStart ? (
                <PortalButton title="Done" tone="secondary" onPress={() => setForm((prev) => ({ ...prev, _pickStart: false }))} />
              ) : null}
            </Field>

            <Field label="End date">
              <Pressable
                onPress={() => setForm((prev) => ({ ...prev, _pickEnd: true }))}
                style={({ pressed }) => [styles.dateBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.dateText}>{form.endDate || 'Pick a date'}</Text>
              </Pressable>
              {form._pickEnd ? (
                <DateTimePicker
                  value={parseISO(form.endDate) || parseISO(form.startDate) || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    if (Platform.OS !== 'ios') setForm((prev) => ({ ...prev, _pickEnd: false }));
                    if (d) setForm((prev) => clampDates({ ...prev, endDate: toISO(d), _pickEnd: Platform.OS === 'ios' }));
                  }}
                />
              ) : null}
              {Platform.OS === 'ios' && form._pickEnd ? (
                <PortalButton title="Done" tone="secondary" onPress={() => setForm((prev) => ({ ...prev, _pickEnd: false }))} />
              ) : null}
            </Field>

            <Field label="Number of sessions">
              <Input
                value={form.sessions}
                onChangeText={(v) => setForm((prev) => ({ ...prev, sessions: v.replace(/[^\d]/g, '') }))}
                placeholder="e.g. 12"
                keyboardType="number-pad"
              />
            </Field>

            <Field label="Notes (optional)">
              <TextArea
                value={form.note}
                onChangeText={(v) => setForm((prev) => ({ ...prev, note: v }))}
                placeholder="Any preference or note for the academy…"
              />
            </Field>
          </PortalCard>
        )}

        {step === 3 && (
          <PortalCard title="Review" subtitle="Confirm your renewal request details.">
            <PortalRow title="Type" value={form.renewType} />
            <PortalRow title="Course" value={selectedCourse?.name || '—'} />
            <PortalRow title="Group" value={selectedGroup?.name || '—'} />
            <PortalRow title="Start" value={form.startDate ? formatDate(form.startDate) : '—'} />
            <PortalRow title="End" value={form.endDate ? formatDate(form.endDate) : '—'} />
            <PortalRow title="Sessions" value={form.sessions || '—'} />
            {!!form.note && <PortalRow title="Notes" value={form.note} />}
          </PortalCard>
        )}
      </ScrollView>

      <StickyBar>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {step > 0 ? (
            <View style={{ flex: 1 }}>
              <PortalButton title="Back" tone="secondary" onPress={prevStep} disabled={busy} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {step < 3 ? (
              <PortalButton title="Next" onPress={nextStep} disabled={busy} />
            ) : (
              <PortalButton title={busy ? 'Submitting…' : 'Submit'} onPress={submit} disabled={busy} />
            )}
          </View>
        </View>
      </StickyBar>
    </PortalModal>
  );
};

const styles = StyleSheet.create({
  muted: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
  },
  sectionLabel: {
    marginBottom: 6,
    color: colors.textTertiary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.round,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectChipActive: {
    backgroundColor: alphaBg(colors.primary, 0.18),
    borderColor: alphaBg(colors.primary, 0.4),
  },
  selectChipText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
  dateBtn: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    justifyContent: 'center',
  },
  dateText: {
    color: colors.textPrimary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.base,
  },
});
