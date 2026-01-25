import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { BackButton } from '../../components/ui/BackButton';
import { BookingCard } from '../../components/playgrounds/BookingCard';

import { getPublicUser } from '../../services/playgrounds/storage';
import { usePlaygroundsActions, usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { useAuth } from '../../services/auth/auth.store';
import { spacing } from '../../theme/tokens';

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

export function MyBookingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  /** ✅ AUTH (FIX) */
  const {
    session,
    authLoading,
    restoreSession,
    logout,
  } = useAuth();

  const loginMode = session?.login_as === 'player' ? 'player' : 'public';

  /** ✅ STORE */
  const { bookings, bookingsLoading, bookingsError } = usePlaygroundsStore((state) => ({
    bookings: state.bookings,
    bookingsLoading: state.bookings.bookingsLoading,
    bookingsError: state.bookingsError,
  }));

  const { listBookings } = usePlaygroundsActions();

  /** LOCAL STATE */
  const [user, setUser] = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);

  /** LOAD BOOKINGS (PUBLIC USER) */
  const loadBookings = useCallback(async () => {
    try {
      const publicUser = await getPublicUser();
      setUser(publicUser);

      if (!publicUser?.id) return;

      await listBookings({ user_id: publicUser.id });
    } catch (err) {
      if (__DEV__) console.warn('Failed to load bookings', err);
    }
  }, [listBookings]);

  /** INITIAL LOAD */
  useEffect(() => {
    if (authLoading) return;
    if (!session) return;

    loadBookings();
  }, [authLoading, loadBookings, session]);

  /** COUNTS */
  const counts = useMemo(() => {
    const base = STATUS_TABS.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
    bookings.forEach((item) => {
      const status = (item.status || 'pending').toLowerCase();
      base.all += 1;
      if (base[status] !== undefined) base[status] += 1;
    });
    return base;
  }, [bookings]);

  /** FILTERED */
  const filteredItems = useMemo(() => {
    if (activeStatus === 'all') return bookings;
    return bookings.filter(
      (item) => (item.status || '').toLowerCase() === activeStatus
    );
  }, [activeStatus, bookings]);

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

  /** ---------- UI ---------- */
  return (
    <AppScreen safe>
      <AppHeader title={t('service.playgrounds.bookings.title')} leftSlot={<BackButton />} />

      <View style={styles.segmentedWrap}>
        <SegmentedControl
          value="bookings"
          onChange={(value) => {
            if (value === 'explore') router.push('/playgrounds/explore');
          }}
          options={[
            { value: 'explore', label: t('playgrounds.explore.header') },
            { value: 'bookings', label: t('playgrounds.bookings.title') },
          ]}
        />
      </View>

      {!session && !authLoading ? (
        <EmptyState
          title={t('service.playgrounds.bookings.empty.authTitle')}
          message={t('service.playgrounds.bookings.empty.authMessage')}
          actionLabel={t('service.playgrounds.bookings.empty.authAction')}
          onAction={() => router.push(`/(auth)/login?mode=${loginMode}`)}
        />
      ) : bookingsLoading ? (
        <SporHiveLoader message={t('service.playgrounds.bookings.loading')} />
      ) : bookingsError ? (
        <ErrorState
          title={t('service.playgrounds.bookings.errors.title')}
          message={bookingsError}
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
              />
            ))}
          </View>

          {filteredItems.length ? (
            <FlatList
              data={filteredItems}
              keyExtractor={(item, index) =>
                String(item.id ?? item.booking_id ?? index)
              }
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
            <Button onPress={() => setCancelTarget(null)}>
              {t('service.playgrounds.bookings.cancel.confirm')}
            </Button>
          </View>
        </View>
      </BottomSheetModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  segmentedWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
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
