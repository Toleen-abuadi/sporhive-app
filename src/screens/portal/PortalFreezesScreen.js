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

const formatDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
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

  const currentFreeze = metrics?.current_freeze || null;
  const upcomingFreeze = metrics?.upcoming_freeze || null;
  const lastFreeze = metrics?.last_freeze || null;
  const freezeCounts = metrics?.freezing_counts || { approved: 0, pending: 0, rejected: 0, canceled: 0 };
  const canRequestFreeze = !currentFreeze && !upcomingFreeze && Number(metrics?.remaining_sessions || 0) > 0;

  const runSubmit = async () => {
    if (!startDate || !endDate || !reason.trim()) {
      toast.warning(t('portal.freezes.validation'));
      return;
    }
    setSubmitting(true);
    const payload = { start_date: formatDate(startDate), end_date: formatDate(endDate), reason: reason.trim() };
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
        title="What is a freeze?"
        summary="A freeze temporarily pauses your registration while preserving remaining sessions."
        bullets={[
          'Use freeze when you cannot attend for a short period.',
          'Eligibility depends on active status, policy, and remaining sessions.',
          'After request, academy reviews and confirms the effective dates.',
        ]}
      />

      {canRequestFreeze ? (
        <PortalActionBanner
          title="Action Required"
          description="Need a temporary break? Request your freeze before your next attendance cycle."
          actionLabel="Request Freeze"
          onAction={() => setConfirmOpen(true)}
        />
      ) : null}

      {loading && !overview ? <PortalEmptyState title="Loading freeze details" description="Please wait while we load your freeze status." /> : null}

      {error && !overview ? <PortalErrorState title="Could not load freeze status" message={error?.message || 'Try again to continue.'} onRetry={() => refresh?.()} retryLabel={t('portal.common.retry')} /> : null}

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
            {currentFreeze ? <Text variant="bodySmall" color={colors.textPrimary}>{`Current freeze: ${String(currentFreeze?.start_date || '').slice(0, 10)} → ${String(currentFreeze?.end_date || '').slice(0, 10)}`}</Text> : null}
            {upcomingFreeze ? <Text variant="bodySmall" color={colors.textPrimary}>{`Upcoming freeze: ${String(upcomingFreeze?.start_date || '').slice(0, 10)} → ${String(upcomingFreeze?.end_date || '').slice(0, 10)}`}</Text> : null}
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
            <Input label={t('portal.freezes.reason')} value={reason} onChangeText={setReason} placeholder={t('portal.freezes.reasonPlaceholder')} multiline style={styles.textArea} />
            <Button onPress={() => setConfirmOpen(true)} loading={submitting}>{t('portal.freezes.submit')}</Button>
          </PortalCard>

          {!hasAnyFreezeData ? <PortalEmptyState icon="pause-circle" title={t('portal.freezes.emptyTitle')} description={t('portal.freezes.emptyDescription')} /> : null}
        </>
      ) : null}

      <PortalConfirmSheet
        visible={confirmOpen}
        title={t('portal.freezes.confirmTitle')}
        description="Please confirm your freeze request before submission."
        policyPoints={[
          'Freeze dates are subject to academy approval.',
          'Sessions are paused only for approved freeze duration.',
          'You may need to contact support if dates must change after approval.',
        ]}
        requireAcknowledge
        acknowledgeLabel="I understand freeze policy and want to proceed"
        warning={t('portal.freezes.confirmWarning')}
        confirmLabel={t('portal.freezes.submit')}
        cancelLabel={t('portal.common.cancel')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); runSubmit(); }}
      />

      {showStartPicker ? <DateTimePicker value={startDate || new Date()} onChange={(event, date) => { setShowStartPicker(false); if (date) setStartDate(date); }} mode="date" /> : null}
      {showEndPicker ? <DateTimePicker value={endDate || new Date()} onChange={(event, date) => { setShowEndPicker(false); if (date) setEndDate(date); }} mode="date" /> : null}
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
