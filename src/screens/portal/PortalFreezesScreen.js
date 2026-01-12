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

export function PortalFreezesScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, isRTL } = useTranslation();
  const { overview } = usePortalOverview();
  const metrics = overview?.performance?.metrics || overview?.raw?.performance_feedback?.metrics || {};

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentFreeze = metrics?.current_freeze || metrics?.freeze?.current || null;
  const upcomingFreeze = metrics?.upcoming_freeze || metrics?.freeze?.upcoming || null;
  const freezeCounts = metrics?.freezing_counts || metrics?.freeze?.counts || null;

  const freezeSummary = useMemo(() => {
    const countText = freezeCounts?.available || freezeCounts?.remaining || freezeCounts?.allowed;
    if (countText != null) return `${t('portal.freezes.available')} ${countText}`;
    return t('portal.freezes.summary');
  }, [freezeCounts, t]);

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
    } else {
      toast.error(res?.error?.message || t('portal.freezes.error'));
    }
    setSubmitting(false);
  };

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader title={t('portal.freezes.title')} subtitle={t('portal.freezes.subtitle')} />

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          {t('portal.freezes.currentStatus')}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
          {freezeSummary}
        </Text>
        {currentFreeze ? (
          <View style={styles.statusRow}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.freezes.currentFreeze')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {currentFreeze?.start_date || '—'} → {currentFreeze?.end_date || '—'}
            </Text>
          </View>
        ) : null}
        {upcomingFreeze ? (
          <View style={styles.statusRow}>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.freezes.upcomingFreeze')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {upcomingFreeze?.start_date || '—'} → {upcomingFreeze?.end_date || '—'}
            </Text>
          </View>
        ) : null}
      </PortalCard>

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          {t('portal.freezes.requestTitle')}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
          {t('portal.freezes.requestSubtitle')}
        </Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border }]} onPress={() => setShowStartPicker(true)}>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {formatDate(startDate) || t('portal.freezes.startDate')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border }]} onPress={() => setShowEndPicker(true)}>
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

      {!currentFreeze && !upcomingFreeze ? (
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
  card: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  statusRow: {
    marginTop: spacing.md,
  },
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
  rtl: {
    direction: 'rtl',
  },
});
