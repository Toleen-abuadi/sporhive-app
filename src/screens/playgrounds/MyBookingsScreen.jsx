import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { BackButton } from '../../components/ui/BackButton';
import { endpoints } from '../../services/api/endpoints';
import { getPublicUser } from '../../services/playgrounds/storage';
import { BookingCard } from '../../components/playgrounds/BookingCard';
import { spacing } from '../../theme/tokens';

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

export function MyBookingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const publicUser = await getPublicUser();
      setUser(publicUser);
      if (!publicUser?.id) {
        setLoading(false);
        return;
      }
      const res = await endpoints.playgrounds.listBookings({ user_id: publicUser.id });
      const list = Array.isArray(res?.bookings)
        ? res.bookings
        : Array.isArray(res?.data?.bookings)
        ? res.data.bookings
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setItems(list);
    } catch (err) {
      setError(err?.message || t('service.playgrounds.bookings.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const counts = useMemo(() => {
    const base = STATUS_TABS.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
    items.forEach((item) => {
      const status = (item.status || 'pending').toLowerCase();
      base.all += 1;
      if (base[status] !== undefined) {
        base[status] += 1;
      }
    });
    return base;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeStatus === 'all') return items;
    return items.filter((item) => (item.status || '').toLowerCase() === activeStatus);
  }, [activeStatus, items]);

  const statusLabelMap = useMemo(
    () => ({
      all: t('service.playgrounds.bookings.status.all'),
      pending: t('service.playgrounds.bookings.status.pending'),
      approved: t('service.playgrounds.bookings.status.approved'),
      rejected: t('service.playgrounds.bookings.status.rejected'),
      cancelled: t('service.playgrounds.bookings.status.cancelled'),
    }),
    [t]
  );

  return (
    <Screen safe>
      <AppHeader title={t('service.playgrounds.bookings.title')} leftSlot={<BackButton />} />
      {!user?.id && !loading ? (
        <EmptyState
          title={t('service.playgrounds.bookings.empty.authTitle')}
          message={t('service.playgrounds.bookings.empty.authMessage')}
          actionLabel={t('service.playgrounds.bookings.empty.authAction')}
          onAction={() => router.push('/playgrounds/auth')}
        />
      ) : loading ? (
        <SporHiveLoader message={t('service.playgrounds.bookings.loading')} />
      ) : error ? (
        <ErrorState
          title={t('service.playgrounds.bookings.errors.title')}
          message={error}
          onAction={loadBookings}
        />
      ) : (
        <>
          <View style={styles.filterRow}>
            {STATUS_TABS.map((status) => (
              <Chip
                key={status}
                label={t('service.playgrounds.bookings.filters.labelWithCount', {
                  label: statusLabelMap[status],
                  count: counts[status] || 0,
                })}
                selected={activeStatus === status}
                onPress={() => setActiveStatus(status)}
                accessibilityLabel={t('service.playgrounds.bookings.filters.accessibility', {
                  status: statusLabelMap[status],
                })}
              />
            ))}
          </View>
          {filteredItems.length ? (
            <FlatList
              data={filteredItems}
              keyExtractor={(item, index) => String(item.id ?? item.booking_id ?? index)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <BookingCard booking={item} onCancel={setCancelTarget} />
              )}
            />
          ) : (
            <EmptyState
              title={t('service.playgrounds.bookings.empty.title')}
              message={t('service.playgrounds.bookings.empty.message')}
              actionLabel={t('service.playgrounds.bookings.empty.action')}
              onAction={() => router.push('/playgrounds/explore')}
            />
          )}
        </>
      )}

      <BottomSheetModal visible={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        <View style={styles.cancelSheet}>
          <Text variant="h4" weight="semibold">
            {t('service.playgrounds.bookings.cancel.title')}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t('service.playgrounds.bookings.cancel.message')}
          </Text>
          <View style={styles.cancelActions}>
            <Button variant="secondary" onPress={() => setCancelTarget(null)}>
              {t('service.playgrounds.bookings.cancel.keep')}
            </Button>
            <Button
              onPress={() => {
                setCancelTarget(null);
              }}
            >
              {t('service.playgrounds.bookings.cancel.confirm')}
            </Button>
          </View>
        </View>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  cancelSheet: {
    gap: spacing.md,
  },
  cancelActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
