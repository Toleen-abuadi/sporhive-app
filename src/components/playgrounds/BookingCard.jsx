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

function getVenueName(booking, t) {
  return booking?.venue?.name || booking?.venue_name || booking?.venue?.title || t('service.playgrounds.common.playground');
}

function getAcademyName(booking) {
  return booking?.academy_profile?.public_name || booking?.academy?.public_name || booking?.academy_name || '';
}

function getBookingDate(booking, t) {
  return booking?.date || booking?.booking_date || t('service.playgrounds.bookings.labels.dateTbd');
}

function getBookingPlayers(booking) {
  const players = Number(booking?.number_of_players);
  return Number.isFinite(players) && players > 0 ? players : null;
}

function getBookingLocation(booking) {
  return booking?.venue?.base_location || '';
}

function getBookingPayment(booking) {
  return {
    type: booking?.payment?.payment_type || booking?.payment_type || '',
    amount: booking?.payment?.amount ?? booking?.total ?? booking?.total_price,
    currency: booking?.payment?.currency || booking?.currency,
  };
}

export function BookingCard({ booking, onCancel }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const statusMeta = resolveStatus(booking.status);
  const venueName = getVenueName(booking, t);
  const academyName = getAcademyName(booking);
  const date = getBookingDate(booking, t);
  const time = formatTimeWindow(booking, t);
  const paymentInfo = getBookingPayment(booking);
  const paymentType = paymentInfo.type ? String(paymentInfo.type).toLowerCase() : '';
  const payment = paymentInfo.type
    ? paymentType === 'cash'
      ? t('service.playgrounds.bookings.payment.cash')
      : paymentType === 'cliq'
      ? t('service.playgrounds.bookings.payment.cliq')
      : t('service.playgrounds.bookings.payment.unknown', {
          payment: String(paymentInfo.type).toUpperCase(),
        })
    : t('service.playgrounds.bookings.payment.tbd');
  const total = formatMoney(paymentInfo.amount, paymentInfo.currency, t);
  const bookingCode = booking?.booking_code || '';
  const players = getBookingPlayers(booking);
  const location = getBookingLocation(booking);
  const detailsLine = [academyName, location, players ? t('service.playgrounds.filters.playersCount', { count: players }) : '', bookingCode ? `#${bookingCode}` : '']
    .filter(Boolean)
    .join(' • ');
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
      {detailsLine ? (
        <Text variant="caption" color={colors.textSecondary}>
          {detailsLine}
        </Text>
      ) : null}
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
