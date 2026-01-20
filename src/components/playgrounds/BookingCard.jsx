import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Phone, MessageCircle } from 'lucide-react-native';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { Chip } from '../ui/Chip';
import { Button } from '../ui/Button';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

const STATUS_LABELS = {
  pending: { labelKey: 'service.playgrounds.bookings.status.pending', tone: 'warning' },
  approved: { labelKey: 'service.playgrounds.bookings.status.approved', tone: 'success' },
  rejected: { labelKey: 'service.playgrounds.bookings.status.rejected', tone: 'danger' },
  cancelled: { labelKey: 'service.playgrounds.bookings.status.cancelled', tone: 'default' },
};

function resolveStatus(status) {
  if (!status) return STATUS_LABELS.pending;
  const key = status.toLowerCase();
  return (
    STATUS_LABELS[key] || {
      labelKey: 'service.playgrounds.bookings.status.custom',
      tone: 'default',
      customLabel: status,
    }
  );
}

function formatMoney(amount, currency, t) {
  if (amount === null || amount === undefined) return t('service.playgrounds.common.placeholder');
  const parsed = Number(amount);
  if (Number.isNaN(parsed)) return t('service.playgrounds.common.placeholder');
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${parsed.toFixed(2)}`;
}

function formatTimeWindow(booking, t) {
  const start = booking.start_time || booking.slot?.start_time || booking.slot?.start || '';
  const end = booking.end_time || booking.slot?.end_time || booking.slot?.end || '';
  if (!start && !end) return t('service.playgrounds.bookings.labels.timeTbd');
  if (!end) return start;
  return `${start} - ${end}`;
}

function resolveContactPhone(booking) {
  return booking.contact_phone || booking.contact_whatsapp || booking.phone || '';
}

export function BookingCard({ booking, onCancel }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const statusMeta = resolveStatus(booking.status);
  const venueName =
    booking.venue?.name || booking.venue?.title || t('service.playgrounds.common.playground');
  const date =
    booking.booking_date || booking.date || t('service.playgrounds.bookings.labels.dateTbd');
  const time = formatTimeWindow(booking, t);
  const paymentType = booking.payment_type ? booking.payment_type.toLowerCase() : '';
  const payment = booking.payment_type
    ? paymentType === 'cash'
      ? t('service.playgrounds.bookings.payment.cash')
      : paymentType === 'cliq'
      ? t('service.playgrounds.bookings.payment.cliq')
      : t('service.playgrounds.bookings.payment.unknown', {
          payment: booking.payment_type.toUpperCase(),
        })
    : t('service.playgrounds.bookings.payment.tbd');
  const total = formatMoney(booking.total || booking.total_price, booking.currency, t);
  const phone = resolveContactPhone(booking);
  const statusLabel = statusMeta.customLabel
    ? t(statusMeta.labelKey, { status: statusMeta.customLabel })
    : t(statusMeta.labelKey);

  const statusColor = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.error,
    default: colors.textSecondary,
  }[statusMeta.tone];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text variant="bodySmall" weight="semibold">
          {venueName}
        </Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: colors.surfaceElevated, borderColor: statusColor },
          ]}
        >
          <Text variant="caption" weight="semibold" style={{ color: statusColor }}>
            {statusLabel}
          </Text>
        </View>
      </View>
      <Text variant="bodySmall" color={colors.textSecondary}>
        {t('service.playgrounds.bookings.labels.dateTime', { date, time })}
      </Text>
      <View style={styles.metaRow}>
        <Chip label={payment} selected />
        <Text variant="bodySmall" weight="semibold">
          {total}
        </Text>
      </View>
      <View style={styles.actionsRow}>
        <View style={styles.contactActions}>
          {phone ? (
            <>
              <Button
                variant="secondary"
                size="small"
                onPress={() => Linking.openURL(`tel:${phone}`)}
                accessibilityLabel={t('service.playgrounds.bookings.actions.callAccessibility')}
              >
                <Phone size={14} color={colors.textPrimary} /> {t('service.playgrounds.bookings.actions.call')}
              </Button>
              <Button
                variant="secondary"
                size="small"
                onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}
                accessibilityLabel={t('service.playgrounds.bookings.actions.whatsappAccessibility')}
              >
                <MessageCircle size={14} color={colors.textPrimary} /> {t('service.playgrounds.bookings.actions.whatsapp')}
              </Button>
            </>
          ) : null}
        </View>
        {onCancel && ['pending', 'approved'].includes((booking.status || '').toLowerCase()) ? (
          <Button
            variant="ghost"
            size="small"
            onPress={() => onCancel(booking)}
            accessibilityLabel={t('service.playgrounds.bookings.actions.cancelAccessibility')}
          >
            {t('service.playgrounds.bookings.actions.cancel')}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contactActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
