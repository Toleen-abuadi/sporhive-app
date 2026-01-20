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

const alphaHex = (hex, alpha = '1A') => {
  if (!hex) return hex;
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split('');
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  if (normalized.length === 6) return `#${normalized}${alpha}`;
  if (normalized.length === 8) return `#${normalized.slice(0, 6)}${alpha}`;
  return hex;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

function CountPill({ label, value, tone = 'neutral', colors }) {
  const toneColor =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
        ? colors.warning
        : tone === 'danger'
          ? colors.error
          : colors.textSecondary;

  const bg = alphaHex(toneColor, '1A');
  const border = alphaHex(toneColor, '33');

  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
      <Text variant="caption" weight="semibold" style={{ color: toneColor }}>
        {label}: {value ?? 0}
      </Text>
    </View>
  );
}

function KV({ k, v, colors, placeholder }) {
  return (
    <View style={styles.kvRow}>
      <Text variant="bodySmall" color={colors.textMuted} style={styles.kvKey}>
        {k}
      </Text>
      <Text variant="bodySmall" color={colors.textPrimary} style={styles.kvVal}>
        {v || placeholder}
      </Text>
    </View>
  );
}

export function PortalFreezesScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, isRTL } = useTranslation();
  const { overview } = usePortalOverview();
  const placeholder = t('portal.common.placeholder');

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
    const remText = remainingSessions != null
      ? t('portal.freezes.remainingSessionsInline', { count: remainingSessions })
      : '';

    return t('portal.freezes.summaryLine', {
      total,
      approved,
      pending,
      remainingText: remText,
    });
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
      <PortalHeader
        title={t('portal.freezes.title')}
        subtitle={t('portal.freezes.subtitle')}
      />

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
            label={t('portal.freezes.approved')}
            value={freezeCounts?.approved}
            tone="success"
            colors={colors}
          />
          <CountPill
            label={t('portal.freezes.pending')}
            value={freezeCounts?.pending}
            tone="warning"
            colors={colors}
          />
          <CountPill
            label={t('portal.freezes.rejected')}
            value={freezeCounts?.rejected}
            tone="danger"
            colors={colors}
          />
          <CountPill
            label={t('portal.freezes.canceled')}
            value={freezeCounts?.canceled}
            tone="neutral"
            colors={colors}
          />
        </View>

        {currentFreeze ? (
          <View style={styles.statusRow}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.freezes.currentFreeze')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {t('portal.freezes.range', {
                start: currentFreeze?.start_date ? String(currentFreeze.start_date).slice(0, 10) : placeholder,
                end: currentFreeze?.end_date ? String(currentFreeze.end_date).slice(0, 10) : placeholder,
              })}
            </Text>
          </View>
        ) : null}

        {upcomingFreeze ? (
          <View style={styles.statusRow}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.freezes.upcomingFreeze')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {t('portal.freezes.range', {
                start: upcomingFreeze?.start_date ? String(upcomingFreeze.start_date).slice(0, 10) : placeholder,
                end: upcomingFreeze?.end_date ? String(upcomingFreeze.end_date).slice(0, 10) : placeholder,
              })}
            </Text>
          </View>
        ) : null}
      </PortalCard>

      {/* ✅ Last freeze details (this is what your payload actually has) */}
      {lastFreeze ? (
        <PortalCard style={styles.card}>
          <View style={styles.lastHeader}>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {t('portal.freezes.lastFreeze')}
            </Text>
            <View style={[styles.badge, { borderColor: colors.border, backgroundColor: alphaHex(colors.textMuted, '14') }]}>
              <Text variant="caption" color={colors.textSecondary}>
                {String(lastFreeze?.status || '').toUpperCase() || placeholder}
              </Text>
            </View>
          </View>

          <KV k={t('portal.freezes.period')} v={t('portal.freezes.range', {
            start: lastFreeze?.start_date ? String(lastFreeze.start_date).slice(0, 10) : placeholder,
            end: lastFreeze?.end_date ? String(lastFreeze.end_date).slice(0, 10) : placeholder,
          })} colors={colors} placeholder={placeholder} />
          <KV k={t('portal.freezes.processedBy')} v={lastFreeze?.processed_by ? String(lastFreeze.processed_by) : placeholder} colors={colors} placeholder={placeholder} />
          <KV k={t('portal.freezes.processedAt')} v={lastFreeze?.processed_at ? String(lastFreeze.processed_at).replace('T', ' ').slice(0, 16) : placeholder} colors={colors} placeholder={placeholder} />
          <KV k={t('portal.freezes.remainingSnapshot')} v={lastFreeze?.remaining_sessions_snapshot != null ? String(lastFreeze.remaining_sessions_snapshot) : placeholder} colors={colors} placeholder={placeholder} />
          <KV k={t('portal.freezes.reason')} v={lastFreeze?.reason ? String(lastFreeze.reason) : placeholder} colors={colors} placeholder={placeholder} />
          <KV k={t('portal.freezes.notes')} v={lastFreeze?.notes ? String(lastFreeze.notes) : placeholder} colors={colors} placeholder={placeholder} />
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
