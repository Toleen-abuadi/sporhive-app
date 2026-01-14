// Portal Freezes Screen: view freeze status and submit a freeze request.
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';

import { portalApi } from '../../services/portal/portal.api';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { useToast } from '../../components/ui/ToastHost';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

const formatDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatRange = (start, end) => {
  const s = start ? String(start).slice(0, 10) : '—';
  const e = end ? String(end).slice(0, 10) : '—';
  return `${s} → ${e}`;
};

function CountPill({ label, value, tone = 'neutral' }) {
  const bg =
    tone === 'success'
      ? 'rgba(34,197,94,0.14)'
      : tone === 'warning'
        ? 'rgba(245,158,11,0.16)'
        : tone === 'danger'
          ? 'rgba(239,68,68,0.14)'
          : 'rgba(148,163,184,0.14)';

  const border =
    tone === 'success'
      ? 'rgba(34,197,94,0.28)'
      : tone === 'warning'
        ? 'rgba(245,158,11,0.30)'
        : tone === 'danger'
          ? 'rgba(239,68,68,0.28)'
          : 'rgba(148,163,184,0.24)';

  const text =
    tone === 'success'
      ? '#22C55E'
      : tone === 'warning'
        ? '#F59E0B'
        : tone === 'danger'
          ? '#EF4444'
          : '#A9B4CC';

  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
      <Text variant="caption" weight="semibold" style={{ color: text }}>
        {label}: {value ?? 0}
      </Text>
    </View>
  );
}

function KV({ k, v, colors }) {
  return (
    <View style={styles.kvRow}>
      <Text variant="bodySmall" color={colors.textMuted} style={styles.kvKey}>
        {k}
      </Text>
      <Text variant="bodySmall" color={colors.textPrimary} style={styles.kvVal}>
        {v || '—'}
      </Text>
    </View>
  );
}

export function PortalFreezesScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, isRTL } = useTranslation();
  const { overview } = usePortalOverview();

  // ✅ Your real data lives here in the overview response
  const metrics = overview?.performance?.metrics || {};

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Prefer current/upcoming if present, otherwise rely on last_freeze (history)
  const currentFreeze = metrics?.current_freeze || null;
  const upcomingFreeze = metrics?.upcoming_freeze || null;
  const lastFreeze = metrics?.last_freeze || null;

  // ✅ counts in your payload are {approved,pending,rejected,canceled}
  const freezeCounts = metrics?.freezing_counts || { approved: 0, pending: 0, rejected: 0, canceled: 0 };

  const summaryLine = useMemo(() => {
    const approved = Number(freezeCounts?.approved || 0);
    const pending = Number(freezeCounts?.pending || 0);
    const total = approved + pending + Number(freezeCounts?.rejected || 0) + Number(freezeCounts?.canceled || 0);

    // If you want, you can also incorporate remaining_sessions
    const remainingSessions = metrics?.remaining_sessions;
    const remText = remainingSessions != null ? ` • ${t('portal.freezes.remainingSessions', { defaultValue: 'Remaining sessions' })}: ${remainingSessions}` : '';

    return `${t('portal.freezes.summary', { defaultValue: 'Freeze summary' })}: ${total} • ${t('portal.freezes.approved', { defaultValue: 'Approved' })}: ${approved} • ${t('portal.freezes.pending', { defaultValue: 'Pending' })}: ${pending}${remText}`;
  }, [freezeCounts, metrics?.remaining_sessions, t]);

  const onSubmit = async () => {
    if (!startDate || !endDate || !reason.trim()) {
      toast.warning(t('portal.freezes.validation'));
      return;
    }
    setSubmitting(true);

    const payload = {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      reason: reason.trim(),
    };

    const res = await portalApi.submitFreeze(payload);
    if (res?.success) {
      toast.success(t('portal.freezes.success'));
      setReason('');
      setStartDate(null);
      setEndDate(null);
      // NOTE: overview refresh is handled elsewhere; if you want instant update, call your overview refresh.
    } else {
      toast.error(res?.error?.message || t('portal.freezes.error'));
    }
    setSubmitting(false);
  };

  const hasAnyFreezeData = Boolean(currentFreeze || upcomingFreeze || lastFreeze);

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader title={t('portal.freezes.title')} subtitle={t('portal.freezes.subtitle')} />

      {/* ✅ Status + counts */}
      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          {t('portal.freezes.currentStatus')}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
          {summaryLine}
        </Text>

        <View style={styles.pillsRow}>
          <CountPill
            label={t('portal.freezes.approved', { defaultValue: 'Approved' })}
            value={freezeCounts?.approved}
            tone="success"
          />
          <CountPill
            label={t('portal.freezes.pending', { defaultValue: 'Pending' })}
            value={freezeCounts?.pending}
            tone="warning"
          />
          <CountPill
            label={t('portal.freezes.rejected', { defaultValue: 'Rejected' })}
            value={freezeCounts?.rejected}
            tone="danger"
          />
          <CountPill
            label={t('portal.freezes.canceled', { defaultValue: 'Canceled' })}
            value={freezeCounts?.canceled}
            tone="neutral"
          />
        </View>

        {currentFreeze ? (
          <View style={styles.statusRow}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.freezes.currentFreeze')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {formatRange(currentFreeze?.start_date, currentFreeze?.end_date)}
            </Text>
          </View>
        ) : null}

        {upcomingFreeze ? (
          <View style={styles.statusRow}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.freezes.upcomingFreeze')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {formatRange(upcomingFreeze?.start_date, upcomingFreeze?.end_date)}
            </Text>
          </View>
        ) : null}
      </PortalCard>

      {/* ✅ Last freeze details (this is what your payload actually has) */}
      {lastFreeze ? (
        <PortalCard style={styles.card}>
          <View style={styles.lastHeader}>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {t('portal.freezes.lastFreeze', { defaultValue: 'Last freeze' })}
            </Text>
            <View style={[styles.badge, { borderColor: colors.border }]}>
              <Text variant="caption" color={colors.textSecondary}>
                {String(lastFreeze?.status || '').toUpperCase() || '—'}
              </Text>
            </View>
          </View>

          <KV k={t('portal.freezes.period', { defaultValue: 'Period' })} v={formatRange(lastFreeze?.start_date, lastFreeze?.end_date)} colors={colors} />
          <KV k={t('portal.freezes.processedBy', { defaultValue: 'Processed by' })} v={lastFreeze?.processed_by ? String(lastFreeze.processed_by) : '—'} colors={colors} />
          <KV k={t('portal.freezes.processedAt', { defaultValue: 'Processed at' })} v={lastFreeze?.processed_at ? String(lastFreeze.processed_at).replace('T', ' ').slice(0, 16) : '—'} colors={colors} />
          <KV k={t('portal.freezes.remainingSnapshot', { defaultValue: 'Remaining sessions snapshot' })} v={lastFreeze?.remaining_sessions_snapshot != null ? String(lastFreeze.remaining_sessions_snapshot) : '—'} colors={colors} />
          <KV k={t('portal.freezes.reason', { defaultValue: 'Reason' })} v={lastFreeze?.reason ? String(lastFreeze.reason) : '—'} colors={colors} />
          <KV k={t('portal.freezes.notes', { defaultValue: 'Notes' })} v={lastFreeze?.notes ? String(lastFreeze.notes) : '—'} colors={colors} />
        </PortalCard>
      ) : null}

      {/* Freeze request form (unchanged behavior) */}
      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          {t('portal.freezes.requestTitle')}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
          {t('portal.freezes.requestSubtitle')}
        </Text>

        <View style={styles.dateRow}>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border }]}
            onPress={() => setShowStartPicker(true)}
          >
            <Text variant="bodySmall" color={colors.textPrimary}>
              {formatDate(startDate) || t('portal.freezes.startDate')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border }]}
            onPress={() => setShowEndPicker(true)}
          >
            <Text variant="bodySmall" color={colors.textPrimary}>
              {formatDate(endDate) || t('portal.freezes.endDate')}
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label={t('portal.freezes.reason')}
          value={reason}
          onChangeText={setReason}
          placeholder={t('portal.freezes.reasonPlaceholder')}
          multiline
          style={styles.textArea}
        />

        <Button onPress={onSubmit} loading={submitting}>
          {t('portal.freezes.submit')}
        </Button>
      </PortalCard>

      {!hasAnyFreezeData ? (
        <PortalEmptyState
          icon="pause-circle"
          title={t('portal.freezes.emptyTitle')}
          description={t('portal.freezes.emptyDescription')}
        />
      ) : null}

      {showStartPicker ? (
        <DateTimePicker
          value={startDate || new Date()}
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
          mode="date"
        />
      ) : null}

      {showEndPicker ? (
        <DateTimePicker
          value={endDate || new Date()}
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
          mode="date"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  rtl: {
    direction: 'rtl',
  },
  card: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  statusRow: {
    marginTop: spacing.md,
  },

  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },

  lastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(148,163,184,0.08)',
  },

  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  kvKey: { flex: 1 },
  kvVal: { flex: 1, textAlign: 'right' },

  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  textArea: {
    marginTop: spacing.sm,
  },
});
