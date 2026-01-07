// src/screens/portal/modals/RequestFreezeModal.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { portalApi } from '../../../services/portal/portal.api';
import { usePortalOverview } from '../../../services/portal/portal.hooks';
import { validators, validateMap } from '../../../services/portal/portal.validators';
import { portalStore } from '../../../services/portal/portal.store';

import { colors, spacing, radius, typography, alphaBg } from '../../../theme/portal.styles';
import { PortalModal } from '../../../components/portal/PortalModal';
import { PortalButton, PortalCard, InlineError, StickyBar } from '../../../components/portal/PortalPrimitives';
import { Field, Input, TextArea, Segmented } from '../../../components/portal/PortalForm';

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

export const RequestFreezeModal = ({ visible, onClose }) => {
  const { overview, refresh } = usePortalOverview();

  const tryOutFromOverview =
    overview?.registration?.try_out?.id || overview?.registration?.try_out_id || overview?.registration?.try_out;

  const tryOutCandidates = useMemo(() => {
    const raw = portalStore.getState().rawOverview || overview?.raw || overview?.rawOverview || overview?.raw;
    const fromRaw =
      raw?.available_tryouts || raw?.tryouts || raw?.try_outs || raw?.registration_info?.available_tryouts || [];

    const list = Array.isArray(fromRaw) ? fromRaw : [];
    const normalized = list
      .map((x) => ({
        id: x?.id ?? x?.try_out_id ?? x?.try_out,
        label: x?.name ?? x?.label ?? x?.try_out_name ?? `#${x?.id ?? x?.try_out_id ?? ''}`,
      }))
      .filter((x) => x.id != null);

    if (tryOutFromOverview) {
      const id = Number(tryOutFromOverview);
      const exists = normalized.some((t) => Number(t.id) === id);
      return exists ? normalized : [{ id, label: `#${id}` }, ...normalized];
    }
    return normalized;
  }, [overview, tryOutFromOverview]);

  const defaultTryOut = useMemo(() => {
    if (tryOutCandidates.length === 1) return Number(tryOutCandidates[0].id);
    if (tryOutFromOverview) return Number(tryOutFromOverview);
    return null;
  }, [tryOutCandidates, tryOutFromOverview]);

  const [form, setForm] = useState({
    try_out: defaultTryOut,
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [errs, setErrs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  // date picker state
  const [pickStart, setPickStart] = useState(false);
  const [pickEnd, setPickEnd] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSuccess(null);
    setSubmitting(false);
    setErrs({});
    setForm((p) => ({ ...p, try_out: defaultTryOut }));
  }, [visible, defaultTryOut]);

  const schema = useMemo(
    () => ({
      try_out: [(v) => validators.required(v, 'Tryout is required')],
      start_date: [(v) => validators.required(v, 'Start date is required'), (v) => validators.dateISO(v)],
      end_date: [(v) => validators.required(v, 'End date is required'), (v) => validators.dateISO(v)],
    }),
    []
  );

  const validate = useCallback(
    (next = form) => {
      const e = validateMap(next, schema);
      // cross-field: end >= start
      if (!e.start_date && !e.end_date && next.start_date && next.end_date) {
        const a = parseISO(next.start_date);
        const b = parseISO(next.end_date);
        if (a && b && b < a) e.end_date = 'End date must be after start date';
      }
      setErrs(e);
      return e;
    },
    [form, schema]
  );

  const onSubmit = useCallback(async () => {
    const e = validate(form);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const payload = {
        try_out: Number(form.try_out),
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || '',
      };

      const res = await portalApi.requestFreeze(payload);
      setSuccess({ payload, response: res?.data ?? res });

      // Refresh cached overview so dashboard/training pick up the request
      await refresh();
    } catch (err) {
      setErrs((p) => ({ ...p, _global: err?.message || 'Request failed' }));
    } finally {
      setSubmitting(false);
    }
  }, [form, refresh, validate]);

  const tryOutOptions = useMemo(() => {
    return tryOutCandidates.map((t) => ({ value: Number(t.id), label: t.label }));
  }, [tryOutCandidates]);

  return (
    <PortalModal
      visible={visible}
      title="Request Freeze"
      subtitle="Choose dates for your freeze request"
      onClose={onClose}
      footer={
        <StickyBar>
          <PortalButton
            label={success ? 'Done' : submitting ? 'Submitting…' : 'Submit request'}
            onPress={success ? onClose : onSubmit}
            disabled={submitting}
          />
        </StickyBar>
      }
    >
      {success ? (
        <PortalCard style={{ backgroundColor: alphaBg(colors.success, 0.08), borderColor: alphaBg(colors.success, 0.25) }}>
          <Text style={styles.successTitle}>Freeze request submitted</Text>
          <Text style={styles.successLine}>Start: {success.payload.start_date}</Text>
          <Text style={styles.successLine}>End: {success.payload.end_date}</Text>
          {!!success.payload.reason && <Text style={styles.successLine}>Reason: {success.payload.reason}</Text>}
        </PortalCard>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
          <PortalCard title="Freeze details" subtitle="These will be reviewed by the academy">
            {!!errs._global && <InlineError text={errs._global} />}

            {tryOutOptions.length > 1 ? (
              <Field label="Tryout" error={errs.try_out}>
                <Segmented
                  options={tryOutOptions}
                  value={form.try_out}
                  onChange={(v) => setForm((p) => ({ ...p, try_out: v }))}
                />
              </Field>
            ) : (
              <Field label="Tryout">
                <Input value={form.try_out ? String(form.try_out) : ''} editable={false} />
              </Field>
            )}

            <Field label="Start date" error={errs.start_date}>
              <Pressable
                onPress={() => setPickStart(true)}
                style={({ pressed }) => [styles.dateBtn, pressed ? { opacity: 0.9 } : null]}
              >
                <Text style={styles.dateText}>{form.start_date || 'Pick a date'}</Text>
              </Pressable>
              {pickStart ? (
                <DateTimePicker
                  value={parseISO(form.start_date) || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    if (Platform.OS !== 'ios') setPickStart(false);
                    if (d) setForm((p) => ({ ...p, start_date: toISO(d) }));
                  }}
                />
              ) : null}
              {Platform.OS === 'ios' && pickStart ? (
                <PortalButton label="Done" variant="secondary" onPress={() => setPickStart(false)} />
              ) : null}
            </Field>

            <Field label="End date" error={errs.end_date}>
              <Pressable
                onPress={() => setPickEnd(true)}
                style={({ pressed }) => [styles.dateBtn, pressed ? { opacity: 0.9 } : null]}
              >
                <Text style={styles.dateText}>{form.end_date || 'Pick a date'}</Text>
              </Pressable>
              {pickEnd ? (
                <DateTimePicker
                  value={parseISO(form.end_date) || parseISO(form.start_date) || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    if (Platform.OS !== 'ios') setPickEnd(false);
                    if (d) setForm((p) => ({ ...p, end_date: toISO(d) }));
                  }}
                />
              ) : null}
              {Platform.OS === 'ios' && pickEnd ? (
                <PortalButton label="Done" variant="secondary" onPress={() => setPickEnd(false)} />
              ) : null}
            </Field>

            <Field label="Reason (optional)">
              <TextArea
                value={form.reason}
                onChangeText={(v) => setForm((p) => ({ ...p, reason: v }))}
                placeholder="Add a short note"
              />
            </Field>
          </PortalCard>
        </ScrollView>
      )}
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
  successTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.lg,
    marginBottom: 8,
  },
  successLine: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.5,
  },
});
