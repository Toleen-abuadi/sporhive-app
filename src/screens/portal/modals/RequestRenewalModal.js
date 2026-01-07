// src/screens/portal/modals/RequestRenewalModal.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { portalApi } from '../../../services/portal/portal.api';
import { usePortalOverview } from '../../../services/portal/portal.hooks';
import { validators, validateMap } from '../../../services/portal/portal.validators';

import { PortalModal } from '../../../components/portal/PortalModal';
import { PortalButton, PortalCard, InlineError, StickyBar, PortalRow } from '../../../components/portal/PortalPrimitives';
import { Field, Input, TextArea, Segmented } from '../../../components/portal/PortalForm';
import { colors, spacing, radius, typography, alphaBg } from '../../../theme/portal.styles';

const asISO = (v) => (v ? String(v).slice(0, 10) : '');

export const RequestRenewalModal = ({ visible, onClose }) => {
  const { overview, refresh } = usePortalOverview();
  const tryOutId = overview?.registration?.try_out?.id || overview?.registration?.try_out_id || null;

  const groups = overview?.registration?.availableGroups || [];
  const courses = overview?.registration?.availableCourses || [];

  const [elig, setElig] = useState({ loading: false, ok: true, data: null, error: '' });
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const [form, setForm] = useState({
    try_out: tryOutId ? Number(tryOutId) : null,
    renew_type: 'subscription', // 'course' | 'subscription'
    group: '',
    course: '',
    start_date: '',
    end_date: '',
    number_of_sessions: '',
    player_note: '',
  });

  const [errs, setErrs] = useState({});

  useEffect(() => {
    if (!visible) return;
    setForm({
      try_out: tryOutId ? Number(tryOutId) : null,
      renew_type: 'subscription',
      group: '',
      course: '',
      start_date: '',
      end_date: '',
      number_of_sessions: '',
      player_note: '',
    });
    setErrs({});
    setPreview(null);
    setElig({ loading: false, ok: true, data: null, error: '' });
  }, [visible, tryOutId]);

  // Eligibility check on open
  useEffect(() => {
    if (!visible || !tryOutId) return;
    let alive = true;

    (async () => {
      try {
        setElig({ loading: true, ok: true, data: null, error: '' });
        const res = await portalApi.renewalsEligibility({ try_out: Number(tryOutId) });
        if (!alive) return;
        // backend may return { ok, eligible, message, data }
        const ok = res?.ok ?? res?.eligible ?? true;
        setElig({ loading: false, ok: !!ok, data: res, error: ok ? '' : (res?.message || 'Not eligible') });
      } catch (e) {
        if (!alive) return;
        setElig({ loading: false, ok: true, data: null, error: '' }); // don't block hard
      }
    })();

    return () => {
      alive = false;
    };
  }, [visible, tryOutId]);

  const schema = useMemo(
    () => ({
      try_out: [(v) => validators.required(v, 'Try-out is required')],
      group: [(v) => validators.required(v, 'Group is required')],
      // course optional unless renew_type == course
      start_date: [(v) => validators.dateISO(v, 'Invalid date')],
      end_date: [(v) => validators.dateISO(v, 'Invalid date')],
      number_of_sessions: [(v) => validators.number(v, 'Sessions must be a number')],
    }),
    []
  );

  const validate = useCallback(() => {
    const e = validateMap(form, schema);
    if (form.renew_type === 'course' && !String(form.course || '').trim()) {
      e.course = 'Course is required for course renewal';
    }
    if (form.start_date && form.end_date && asISO(form.end_date) < asISO(form.start_date)) {
      e.end_date = 'End date must be after start date';
    }
    setErrs(e);
    return !Object.keys(e).length;
  }, [form, schema]);

  const submit = useCallback(async () => {
    if (!validate()) return;
    setBusy(true);
    setPreview(null);
    try {
      const payload = {
        try_out: Number(form.try_out),
        renew_type: form.renew_type,
        group: Number(form.group),
        course: form.renew_type === 'course' ? Number(form.course) : null,
        start_date: form.start_date ? asISO(form.start_date) : null,
        end_date: form.end_date ? asISO(form.end_date) : null,
        number_of_sessions: form.number_of_sessions === '' ? null : Number(form.number_of_sessions),
        player_note: String(form.player_note || '').trim() || null,
      };

      const res = await portalApi.renewalsRequest(payload);

      // show backend preview object if present
      const prev = res?.preview || res?.data?.preview || res?.data || res;
      setPreview(prev);

      await refresh();
    } catch (e) {
      setErrs({ _top: e?.message || 'Failed to submit renewal request.' });
    } finally {
      setBusy(false);
    }
  }, [form, validate, refresh]);

  const topErr = errs._top;

  return (
    <PortalModal
      visible={visible}
      title="Request Renewal"
      subtitle="Pick a renewal type, group, and optional details."
      onClose={busy ? null : onClose}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {!!topErr && <InlineError text={topErr} />}

        <PortalCard title="Eligibility" subtitle="We check your renewal rules in the background." style={{ marginTop: spacing.md }}>
          {elig.loading ? (
            <Text style={styles.muted}>Checking eligibility…</Text>
          ) : elig.error ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnTitle}>Heads up</Text>
              <Text style={styles.warnText}>{elig.error}</Text>
            </View>
          ) : (
            <Text style={styles.muted}>You can submit a renewal request.</Text>
          )}
        </PortalCard>

        <PortalCard title="Renewal type" subtitle="Choose subscription or course renewal." style={{ marginTop: spacing.md }}>
          <Segmented
            value={form.renew_type}
            onChange={(v) => setForm((p) => ({ ...p, renew_type: v, course: '' }))}
            options={[
              { value: 'subscription', label: 'Subscription' },
              { value: 'course', label: 'Course' },
            ]}
          />
        </PortalCard>

        <PortalCard title="Selection" subtitle="Group is required. Course is required only in course mode." style={{ marginTop: spacing.md }}>
          <Field label="Try-out *" error={errs.try_out}>
            <Input
              value={form.try_out ? String(form.try_out) : ''}
              onChangeText={(v) => setForm((p) => ({ ...p, try_out: v.replace(/[^\d]/g, '') }))}
              placeholder="Try-out ID"
              keyboardType="number-pad"
            />
          </Field>

          <Field label="Group *" error={errs.group} hint="Enter ID from available groups list (view-only).">
            <Input
              value={String(form.group)}
              onChangeText={(v) => setForm((p) => ({ ...p, group: v.replace(/[^\d]/g, '') }))}
              placeholder="Group ID"
              keyboardType="number-pad"
            />
          </Field>

          {form.renew_type === 'course' ? (
            <Field label="Course *" error={errs.course} hint="Enter ID from available courses list (view-only).">
              <Input
                value={String(form.course)}
                onChangeText={(v) => setForm((p) => ({ ...p, course: v.replace(/[^\d]/g, '') }))}
                placeholder="Course ID"
                keyboardType="number-pad"
              />
            </Field>
          ) : null}
        </PortalCard>

        <PortalCard title="Optional details" subtitle="Dates and sessions are optional unless your academy requires them." style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field label="Start date" error={errs.start_date} hint="YYYY-MM-DD">
                <Input
                  value={form.start_date}
                  onChangeText={(v) => setForm((p) => ({ ...p, start_date: v }))}
                  placeholder="YYYY-MM-DD"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="End date" error={errs.end_date} hint="YYYY-MM-DD">
                <Input
                  value={form.end_date}
                  onChangeText={(v) => setForm((p) => ({ ...p, end_date: v }))}
                  placeholder="YYYY-MM-DD"
                />
              </Field>
            </View>
          </View>

          <Field label="Number of sessions" error={errs.number_of_sessions}>
            <Input
              value={String(form.number_of_sessions)}
              onChangeText={(v) => setForm((p) => ({ ...p, number_of_sessions: v.replace(/[^\d]/g, '') }))}
              placeholder="e.g. 12"
              keyboardType="number-pad"
            />
          </Field>

          <Field label="Player note">
            <TextArea
              value={form.player_note}
              onChangeText={(v) => setForm((p) => ({ ...p, player_note: v }))}
              placeholder="Any preference or note for the academy…"
            />
          </Field>
        </PortalCard>

        <PortalCard title="Available courses & groups (view-only)" subtitle="Use IDs above (no enrollment changes here)." style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionLabel}>Groups</Text>
          {Array.isArray(groups) && groups.length ? (
            groups.slice(0, 6).map((g, idx) => (
              <PortalRow
                key={String(g.id || idx)}
                label={`#${g.id || '—'}`}
                value={g.name || g.label || 'Group'}
              />
            ))
          ) : (
            <Text style={styles.muted}>No groups in payload.</Text>
          )}

          <View style={{ height: spacing.sm }} />

          <Text style={styles.sectionLabel}>Courses</Text>
          {Array.isArray(courses) && courses.length ? (
            courses.slice(0, 6).map((c, idx) => (
              <PortalRow
                key={String(c.id || idx)}
                label={`#${c.id || '—'}`}
                value={c.name || c.label || 'Course'}
              />
            ))
          ) : (
            <Text style={styles.muted}>No courses in payload.</Text>
          )}
        </PortalCard>

        {preview ? (
          <PortalCard title="Backend preview" subtitle="This is what the server returned." style={{ marginTop: spacing.md }}>
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>{JSON.stringify(preview, null, 2)}</Text>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <PortalButton label="Done" onPress={onClose} />
            </View>
          </PortalCard>
        ) : null}
      </ScrollView>

      {!preview ? (
        <StickyBar>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <PortalButton label="Cancel" variant="secondary" onPress={onClose} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <PortalButton label={busy ? 'Submitting...' : 'Submit request'} onPress={submit} disabled={busy || (elig.ok === false)} />
            </View>
          </View>
        </StickyBar>
      ) : null}
    </PortalModal>
  );
};

const styles = StyleSheet.create({
  muted: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.35,
  },
  warnBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: alphaBg(colors.warning, 0.14),
    borderWidth: 1,
    borderColor: alphaBg(colors.warning, 0.35),
  },
  warnTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.sm,
    marginBottom: 6,
  },
  warnText: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.35,
  },
  sectionLabel: {
    marginTop: spacing.sm,
    marginBottom: 6,
    color: colors.textTertiary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  previewBox: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
  },
  previewText: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: 12,
    lineHeight: 16,
  },
});
