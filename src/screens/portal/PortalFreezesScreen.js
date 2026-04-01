import React, { useState } from 'react';
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
import { PortalConfirmSheet } from '../../components/portal/PortalConfirmSheet';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { PortalInfoAccordion } from '../../components/portal/PortalInfoAccordion';
import { PortalErrorState } from '../../components/portal/PortalErrorState';

import { portalApi } from '../../services/api/playerPortalApi';
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

const pad2 = (n) => String(n).padStart(2, '0');

const toDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const localDate = new Date(year, month, day);
      if (Number.isNaN(localDate.getTime())) return null;
      return localDate;
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDate = (value) => {
  const date = toDateOnly(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const addDays = (value, days) => {
  const baseDate = toDateOnly(value);
  if (!baseDate) return null;
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
};

function CountPill({ label, value, tone = 'neutral', colors }) {
  const toneColor = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'danger' ? colors.error : colors.textSecondary;
  const bg = alphaHex(toneColor, '1A');
  const border = alphaHex(toneColor, '33');
  return <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}><Text variant="caption" weight="semibold" style={{ color: toneColor }}>{label}: {value ?? 0}</Text></View>;
}

export function PortalFreezesScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, isRTL } = useTranslation();
  const { overview, loading, error, refresh } = usePortalOverview();

  const metrics = overview?.performance?.metrics || {};
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const today = toDateOnly(new Date());
  const minStartDate = addDays(today, 1);
  const normalizedStartDate = toDateOnly(startDate);
  const effectiveStartDate = normalizedStartDate && minStartDate && normalizedStartDate >= minStartDate ? normalizedStartDate : null;
  const minEndDate = effectiveStartDate ? addDays(effectiveStartDate, 1) : addDays(minStartDate, 1);

  const currentFreeze = metrics?.current_freeze || null;
  const upcomingFreeze = metrics?.upcoming_freeze || null;
  const lastFreeze = metrics?.last_freeze || null;
  const freezeCounts = metrics?.freezing_counts || { approved: 0, pending: 0, rejected: 0, canceled: 0 };
  const canRequestFreeze = !currentFreeze && !upcomingFreeze && Number(metrics?.remaining_sessions || 0) > 0;

  const runSubmit = async () => {
    const start = toDateOnly(startDate);
    const end = toDateOnly(endDate);
    const submitToday = toDateOnly(new Date());
    const submitMinStartDate = addDays(submitToday, 1);
    if (!start || !submitMinStartDate || start < submitMinStartDate) {
      toast.warning(t('portal.freezes.validationStartDate'));
      return;
    }
    const minAllowedEnd = addDays(start, 1);
    if (!end || !minAllowedEnd || end < minAllowedEnd) {
      toast.warning(t('portal.freezes.validationEndDate'));
      return;
    }
    setSubmitting(true);
    const trimmedReason = String(reason || '').trim();
    const payload = {
      start_date: formatDate(start),
      end_date: formatDate(end),
      ...(trimmedReason ? { reason: trimmedReason } : {}),
    };
    const res = await portalApi.submitFreeze(payload);
    if (res?.success) {
      toast.success(t('portal.freezes.success'));
      setReason('');
      setStartDate(null);
      setEndDate(null);
      refresh?.();
    } else {
      toast.error(res?.error?.message || t('portal.freezes.error'));
    }
    setSubmitting(false);
  };

  const hasAnyFreezeData = Boolean(currentFreeze || upcomingFreeze || lastFreeze);

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader title={t('portal.freezes.title')} subtitle={t('portal.freezes.subtitle')} />

      <PortalInfoAccordion
        title={t('portal.freezes.info.title')}
        summary={t('portal.freezes.info.summary')}
        bullets={[
          t('portal.freezes.info.bullet1'),
          t('portal.freezes.info.bullet2'),
          t('portal.freezes.info.bullet3'),
        ]}
      />

      {canRequestFreeze ? (
        <PortalActionBanner
          title={t('portal.common.actionRequired')}
          description={t('portal.freezes.action.description')}
          actionLabel={t('portal.freezes.action.label')}
          onAction={() => setConfirmOpen(true)}
        />
      ) : null}

      {loading && !overview ? <PortalEmptyState title={t('portal.freezes.loadingTitle')} description={t('portal.freezes.loadingDescription')} /> : null}

      {error && !overview ? <PortalErrorState title={t('portal.freezes.errorTitle')} message={error?.message || t('portal.freezes.errorTryAgain')} onRetry={() => refresh?.()} retryLabel={t('portal.common.retry')} /> : null}

      {overview ? (
        <>
          <PortalCard style={styles.card}>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>{t('portal.freezes.currentStatus')}</Text>
            <View style={styles.pillsRow}>
              <CountPill label={t('portal.freezes.approved')} value={freezeCounts?.approved} tone="success" colors={colors} />
              <CountPill label={t('portal.freezes.pending')} value={freezeCounts?.pending} tone="warning" colors={colors} />
              <CountPill label={t('portal.freezes.rejected')} value={freezeCounts?.rejected} tone="danger" colors={colors} />
              <CountPill label={t('portal.freezes.canceled')} value={freezeCounts?.canceled} tone="neutral" colors={colors} />
            </View>
            {currentFreeze ? <Text variant="bodySmall" color={colors.textPrimary}>{t('portal.freezes.currentFreezeRange', { start: String(currentFreeze?.start_date || '').slice(0, 10), end: String(currentFreeze?.end_date || '').slice(0, 10) })}</Text> : null}
            {upcomingFreeze ? <Text variant="bodySmall" color={colors.textPrimary}>{t('portal.freezes.upcomingFreezeRange', { start: String(upcomingFreeze?.start_date || '').slice(0, 10), end: String(upcomingFreeze?.end_date || '').slice(0, 10) })}</Text> : null}
          </PortalCard>

          <PortalCard style={styles.card}>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>{t('portal.freezes.requestTitle')}</Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>{t('portal.freezes.requestSubtitle')}</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border }]} onPress={() => setShowStartPicker(true)}>
                <Text variant="bodySmall" color={colors.textPrimary}>{formatDate(startDate) || t('portal.freezes.startDate')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border }]} onPress={() => setShowEndPicker(true)}>
                <Text variant="bodySmall" color={colors.textPrimary}>{formatDate(endDate) || t('portal.freezes.endDate')}</Text>
              </TouchableOpacity>
            </View>
            <Input label={`${t('portal.freezes.reason')} (${t('join.optional')})`} value={reason} onChangeText={setReason} placeholder={t('portal.freezes.reasonPlaceholder')} multiline style={styles.textArea} />
            <Button onPress={() => setConfirmOpen(true)} loading={submitting}>{t('portal.freezes.submit')}</Button>
          </PortalCard>

          {!hasAnyFreezeData ? <PortalEmptyState icon="pause-circle" title={t('portal.freezes.emptyTitle')} description={t('portal.freezes.emptyDescription')} /> : null}
        </>
      ) : null}

      <PortalConfirmSheet
        visible={confirmOpen}
        title={t('portal.freezes.confirmTitle')}
        description={t('portal.freezes.confirmDescription')}
        policyPoints={[
          t('portal.freezes.policy.one'),
          t('portal.freezes.policy.two'),
          t('portal.freezes.policy.three'),
        ]}
        requireAcknowledge
        acknowledgeLabel={t('portal.freezes.acknowledge')}
        warning={t('portal.freezes.confirmWarning')}
        confirmLabel={t('portal.freezes.submit')}
        cancelLabel={t('portal.common.cancel')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); runSubmit(); }}
      />

      {showStartPicker ? (
        <DateTimePicker
          value={effectiveStartDate || minStartDate || today}
          minimumDate={minStartDate || undefined}
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (!date) return;
            const pickedStart = toDateOnly(date);
            if (!pickedStart) return;
            const safeStart = minStartDate && pickedStart < minStartDate ? minStartDate : pickedStart;
            setStartDate(safeStart);
            setEndDate((prev) => {
              const fallbackEnd = addDays(safeStart, 1);
              if (!prev) return fallbackEnd;
              const prevEnd = toDateOnly(prev);
              if (!prevEnd) return fallbackEnd;
              if (!fallbackEnd) return prevEnd;
              return prevEnd < fallbackEnd ? fallbackEnd : prevEnd;
            });
          }}
          mode="date"
        />
      ) : null}
      {showEndPicker ? (
        <DateTimePicker
          value={toDateOnly(endDate) || minEndDate || addDays(minStartDate, 1) || today}
          minimumDate={minEndDate || undefined}
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (!date) return;
            const pickedEnd = toDateOnly(date);
            if (!pickedEnd) return;
            const safeMinEnd = minEndDate || addDays(minStartDate, 1);
            if (safeMinEnd && pickedEnd < safeMinEnd) {
              setEndDate(safeMinEnd);
              return;
            }
            setEndDate(pickedEnd);
          }}
          mode="date"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  rtl: { direction: 'rtl' },
  card: { marginBottom: spacing.lg, padding: spacing.lg },
  subtitle: { marginTop: spacing.xs },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  dateButton: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: spacing.sm, alignItems: 'center' },
  textArea: { marginTop: spacing.sm },
});
