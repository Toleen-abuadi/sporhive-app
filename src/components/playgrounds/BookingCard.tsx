import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Phone, MessageCircle } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { Chip } from '../ui/Chip';
import { Button } from '../ui/Button';
import { Booking } from '../../services/playgrounds/types';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

type BookingCardProps = {
  booking: Booking;
  onCancel?: (booking: Booking) => void;
};

const STATUS_LABELS: Record<string, { label: string; tone: 'default' | 'success' | 'warning' | 'danger' }> = {
  pending: { label: 'Pending', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'default' },
};

function resolveStatus(status?: string) {
  if (!status) return STATUS_LABELS.pending;
  const key = status.toLowerCase();
  return STATUS_LABELS[key] || { label: status, tone: 'default' };
}

function formatMoney(amount?: number | string | null, currency?: string | null) {
  if (amount === null || amount === undefined) return '--';
  const parsed = Number(amount);
  if (Number.isNaN(parsed)) return '--';
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${parsed.toFixed(2)}`;
}

function formatTimeWindow(booking: Booking) {
  const start = booking.start_time || booking.slot?.start_time || booking.slot?.start || '';
  const end = booking.end_time || booking.slot?.end_time || booking.slot?.end || '';
  if (!start && !end) return 'Time TBD';
  if (!end) return start;
  return `${start} - ${end}`;
}

function resolveContactPhone(booking: Booking) {
  return booking.contact_phone || booking.contact_whatsapp || booking.phone || '';
}

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  const { colors } = useTheme();
  const statusMeta = resolveStatus(booking.status);
  const venueName = booking.venue?.name || booking.venue?.title || 'Playground';
  const date = booking.booking_date || booking.date || 'Date TBD';
  const time = formatTimeWindow(booking);
  const payment = booking.payment_type ? booking.payment_type.toUpperCase() : 'Payment TBD';
  const total = formatMoney(booking.total || booking.total_price, booking.currency);
  const phone = resolveContactPhone(booking);

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
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}22` }]}>
          <Text variant="caption" weight="semibold" style={{ color: statusColor }}>
            {statusMeta.label}
          </Text>
        </View>
      </View>
      <Text variant="bodySmall" color={colors.textSecondary}>
        {date} • {time}
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
                accessibilityLabel="Call venue"
              >
                <Phone size={14} color={colors.textPrimary} /> Call
              </Button>
              <Button
                variant="secondary"
                size="small"
                onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}
                accessibilityLabel="WhatsApp venue"
              >
                <MessageCircle size={14} color={colors.textPrimary} /> WhatsApp
              </Button>
            </>
          ) : null}
        </View>
        {onCancel && ['pending', 'approved'].includes((booking.status || '').toLowerCase()) ? (
          <Button
            variant="ghost"
            size="small"
            onPress={() => onCancel(booking)}
            accessibilityLabel="Cancel booking"
          >
            Cancel
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
