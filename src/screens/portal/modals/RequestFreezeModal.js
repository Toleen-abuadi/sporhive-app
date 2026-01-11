// src/screens/portal/modals/RequestFreezeModal.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { portalApi } from '../../../services/portal/portal.api';
import { usePortal } from '../../../services/portal/portal.hooks';
import { safeNumber, formatDate } from '../../../services/portal/portal.normalize';
import { useToast } from '../../../components/ui/ToastHost';

import { colors, spacing, radius, typography, alphaBg } from '../../../theme/portal.styles';
import { PortalModal } from '../../../components/portal/PortalModal';
import { PortalButton, PortalCard, InlineError, StickyBar, PortalRow } from '../../../components/portal/PortalPrimitives';
import { Field, TextArea } from '../../../components/portal/PortalForm';

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

const daysBetween = (start, end) => {
  const a = parseISO(start);
  const b = parseISO(end);
  if (!a || !b || b < a) return 0;
  const diff = Math.floor((b - a) / (1000 * 60 * 60 * 24));
  return diff + 1;
};

const extractRanges = (metrics = {}) => {
  const ranges = [];
  const addRange = (range) => {
    if (!range) return;
    const start = range.start_date || range.start || range.from || range.startDate;
    const end = range.end_date || range.end || range.to || range.endDate;
    if (start && end) ranges.push({ start, end });
  };

  addRange(metrics.current_freeze || metrics.freeze?.current);
  addRange(metrics.upcoming_freeze || metrics.freeze?.upcoming);

  const history = metrics.freeze_history || metrics.history || metrics.freeze?.history || [];
  (Array.isArray(history) ? history : []).forEach(addRange);

  return ranges;
};

export const RequestFreezeModal = ({ visible, onClose }) => {
  const { overview, refresh } = usePortal();
  const toast = useToast();

  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    pickStart: false,
    pickEnd: false,
  });
  const [errs, setErrs] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const metrics = overview?.performance?.metrics || {};
  const tryOutId = overview?.raw?.registration_info?.try_out_id || overview?.raw?.registration_info?.try_out || null;
  const freezePolicy = metrics.freeze_policy || {};
  const maxDays = safeNumber(freezePolicy?.max_days_per_year ?? freezePolicy?.max_days ?? 0, 0);
  const usedDays = safeNumber(freezePolicy?.used_days ?? freezePolicy?.days_used ?? 0, 0);

  const ranges = useMemo(() => extractRanges(metrics), [metrics]);

  useEffect(() => {
    if (!visible) return;
    setForm({ startDate: '', endDate: '', reason: '', pickStart: false, pickEnd: false });
    setErrs({});
    setSubmitting(false);
  }, [visible]);

  const validate = useCallback(() => {
    const nextErrs = {};
    if (!form.startDate) nextErrs.startDate = 'Start date is required';
    if (!form.endDate) nextErrs.endDate = 'End date is required';

    if (form.startDate && form.endDate) {
      const start = parseISO(form.startDate);
      const end = parseISO(form.endDate);
      if (start && end && end < start) nextErrs.endDate = 'End date must be after start date';

      const overlap = ranges.find((r) => {
        const a = parseISO(r.start);
        const b = parseISO(r.end);
        return a && b && start && end && start <= b && end >= a;
      });
      if (overlap) nextErrs._global = 'Selected dates overlap with an existing freeze.';
    }

    if (maxDays) {
      const requestedDays = daysBetween(form.startDate, form.endDate);
      const remaining = Math.max(maxDays - usedDays, 0);
      if (requestedDays > remaining) {
        nextErrs._global = `Freeze request exceeds remaining ${remaining} day(s) for this year.`;
      }
    }

    setErrs(nextErrs);
    return nextErrs;
  }, [form.endDate, form.startDate, maxDays, ranges, usedDays]);

  const onSubmit = useCallback(async () => {
    const errors = validate();
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      const payload = {
        start_date: form.startDate,
        end_date: form.endDate,
        reason: form.reason || '',
        registration_id: overview?.registration?.id || null,
        try_out: tryOutId ? Number(tryOutId) : null,
      };

      const res = await portalApi.requestFreeze(payload);
      if (!res?.success) throw res?.error || new Error('Request failed');

      toast?.success?.('Freeze request submitted', {
        message: 'Your freeze request has been sent to the academy.',
      });
      await refresh();
      onClose?.();
    } catch (err) {
      const msg = err?.message || 'Request failed';
      setErrs((prev) => ({ ...prev, _global: msg }));
      toast?.error?.('Freeze request failed', { message: msg });
    } finally {
      setSubmitting(false);
    }
  }, [form.endDate, form.reason, form.startDate, overview?.registration?.id, refresh, toast, onClose, validate]);

  return (
    <PortalModal
      visible={visible}
      title="Request Freeze"
      subtitle="Choose dates for your freeze request"
      onClose={onClose}
      footer={
        <StickyBar>
          <PortalButton
            title={submitting ? 'Submitting…' : 'Submit request'}
            onPress={onSubmit}
            disabled={submitting}
          />
        </StickyBar>
      }
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
        <PortalCard title="Freeze details" subtitle="These will be reviewed by the academy">
          {!!errs._global && <InlineError text={errs._global} />}

          {maxDays ? (
            <View style={styles.policyBox}>
              <Text style={styles.policyTitle}>Freeze policy</Text>
              <Text style={styles.policyText}>Max days per year: {maxDays}</Text>
              <Text style={styles.policyText}>Used days: {usedDays}</Text>
            </View>
          ) : null}

          <Field label="Start date" error={errs.startDate}>
            <Pressable
              onPress={() => setForm((prev) => ({ ...prev, pickStart: true }))}
              style={({ pressed }) => [styles.dateBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.dateText}>{form.startDate || 'Pick a date'}</Text>
            </Pressable>
            {form.pickStart ? (
              <DateTimePicker
                value={parseISO(form.startDate) || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (Platform.OS !== 'ios') setForm((prev) => ({ ...prev, pickStart: false }));
                  if (d) setForm((prev) => ({ ...prev, startDate: toISO(d), pickStart: Platform.OS === 'ios' }));
                }}
              />
            ) : null}
            {Platform.OS === 'ios' && form.pickStart ? (
              <PortalButton title="Done" tone="secondary" onPress={() => setForm((prev) => ({ ...prev, pickStart: false }))} />
            ) : null}
          </Field>

          <Field label="End date" error={errs.endDate}>
            <Pressable
              onPress={() => setForm((prev) => ({ ...prev, pickEnd: true }))}
              style={({ pressed }) => [styles.dateBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.dateText}>{form.endDate || 'Pick a date'}</Text>
            </Pressable>
            {form.pickEnd ? (
              <DateTimePicker
                value={parseISO(form.endDate) || parseISO(form.startDate) || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (Platform.OS !== 'ios') setForm((prev) => ({ ...prev, pickEnd: false }));
                  if (d) setForm((prev) => ({ ...prev, endDate: toISO(d), pickEnd: Platform.OS === 'ios' }));
                }}
              />
            ) : null}
            {Platform.OS === 'ios' && form.pickEnd ? (
              <PortalButton title="Done" tone="secondary" onPress={() => setForm((prev) => ({ ...prev, pickEnd: false }))} />
            ) : null}
          </Field>

          <Field label="Reason (optional)">
            <TextArea
              value={form.reason}
              onChangeText={(v) => setForm((prev) => ({ ...prev, reason: v }))}
              placeholder="Add a short note"
            />
          </Field>
        </PortalCard>

        {ranges.length ? (
          <PortalCard title="Existing freezes" style={{ marginTop: spacing.md }}>
            {ranges.map((range, idx) => (
              <PortalRow
                key={`${range.start}-${idx}`}
                title={`Freeze ${idx + 1}`}
                value={`${formatDate(range.start)} → ${formatDate(range.end)}`}
              />
            ))}
          </PortalCard>
        ) : null}
      </ScrollView>
    </PortalModal>
  );
};

const styles = StyleSheet.create({
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
  policyBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: alphaBg(colors.info, 0.14),
    borderWidth: 1,
    borderColor: alphaBg(colors.info, 0.35),
    marginBottom: spacing.md,
  },
  policyTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.sm,
    marginBottom: 6,
  },
  policyText: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
  },
});
