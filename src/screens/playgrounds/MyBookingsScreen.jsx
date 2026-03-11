import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { BackButton } from '../../components/ui/BackButton';
import { BookingCard } from '../../components/playgrounds/BookingCard';

import { usePlaygroundsActions, usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { useAuth } from '../../services/auth/auth.store';
import { spacing } from '../../theme/tokens';
import { safeArray } from '../../utils/safeRender';
import { PLAYGROUNDS_ROUTES } from './playgrounds.routes';

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled'];
const normalizePath = (value) => {
  if (typeof value !== 'string') return '';
  const [path] = value.split('?');
  return (path || '').replace(/\/+$/, '');
};

export function MyBookingsScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const rtl = typeof isRTL === 'boolean' ? isRTL : I18nManager.isRTL;
  const normalizedPathname = normalizePath(pathname);
  const activeCluster = normalizedPathname === PLAYGROUNDS_ROUTES.explore ? 'explore' : 'bookings';

  /** ✅ AUTH (FIX) */
  const {
    session,
    authLoading,
  } = useAuth();

  const loginMode = session?.login_as === 'player' ? 'player' : 'public';

  /** ✅ STORE */
  const { bookings, bookingsLoading, bookingsError } = usePlaygroundsStore((state) => ({
    bookings: state.bookings,
    bookingsLoading: state.bookingsLoading,
    bookingsError: state.bookingsError,
  }));

  const bookingsList = useMemo(() => safeArray(bookings), [bookings]);
  const bookingsErrorMessage = bookingsError?.message || bookingsError;

  const { listBookings } = usePlaygroundsActions();

  /** LOCAL STATE */
  const [activeStatus, setActiveStatus] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);

  const openExplore = useCallback(() => {
    router.replace(PLAYGROUNDS_ROUTES.explore);
  }, [router]);

  const openBookings = useCallback(() => {
    router.replace(PLAYGROUNDS_ROUTES.bookings);
  }, [router]);

  /** LOAD BOOKINGS (PUBLIC USER) */
  const loadBookings = useCallback(async () => {
    try {
      const publicUser = session?.user || null;
      if (!publicUser?.id) return;
      await listBookings({ user_id: publicUser.id });
    } catch (err) {
      if (__DEV__) console.warn('Failed to load bookings', err);
    }
  }, [listBookings, session?.user]);

  /** INITIAL LOAD */
  useEffect(() => {
    if (authLoading) return;
    if (!session) return;

    loadBookings();
  }, [authLoading, loadBookings, session]);

  /** COUNTS */
  const counts = useMemo(() => {
    const base = STATUS_TABS.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
    bookingsList.forEach((item) => {
      const status = (item.status || 'pending').toLowerCase();
      base.all += 1;
      if (base[status] !== undefined) base[status] += 1;
    });
    return base;
  }, [bookingsList]);

  /** FILTERED */
  const filteredItems = useMemo(() => {
    if (activeStatus === 'all') return bookingsList;
    return bookingsList.filter(
      (item) => (item.status || '').toLowerCase() === activeStatus
    );
  }, [activeStatus, bookingsList]);

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
      <AppHeader
        title={t('service.playgrounds.bookings.title')}
        leftSlot={<BackButton fallbackRoute={PLAYGROUNDS_ROUTES.explore} />}
      />

      <View style={styles.clusterSegmentWrap}>
        <View
          style={[
            styles.clusterSegmentTrack,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={openExplore}
            style={({ pressed }) => [
              styles.clusterSegmentItem,
              {
                opacity: pressed ? 0.88 : 1,
                flexDirection: rtl ? 'row-reverse' : 'row',
              },
              activeCluster === 'explore'
                ? { backgroundColor: colors.primary }
                : null,
            ]}
          >
            <Text
              variant="caption"
              weight={activeCluster === 'explore' ? 'bold' : 'semibold'}
              color={activeCluster === 'explore' ? colors.white : colors.textSecondary}
            >
              {t('playgrounds.bookings.segment.explore', 'Explore')}
            </Text>
          </Pressable>

          <Pressable
            onPress={openBookings}
            style={({ pressed }) => [
              styles.clusterSegmentItem,
              {
                opacity: pressed ? 0.88 : 1,
                flexDirection: rtl ? 'row-reverse' : 'row',
              },
              activeCluster === 'bookings'
                ? { backgroundColor: colors.primary }
                : null,
            ]}
          >
            <Text
              variant="caption"
              weight={activeCluster === 'bookings' ? 'bold' : 'semibold'}
              color={activeCluster === 'bookings' ? colors.white : colors.textSecondary}
            >
              {t('playgrounds.bookings.segment.bookings', 'Bookings')}
            </Text>
          </Pressable>
        </View>
      </View>

      {!session && !authLoading ? (
        <EmptyState
          title={t('service.playgrounds.bookings.empty.authTitle')}
          message={t('service.playgrounds.bookings.empty.authMessage')}
          action={(
            <View style={styles.authActions}>
              <Button
                onPress={() =>
                  router.push(
                    `/(auth)/login?mode=${loginMode}&redirectTo=${encodeURIComponent(
                      PLAYGROUNDS_ROUTES.bookings
                    )}`
                  )
                }
              >
                {t('service.playgrounds.bookings.empty.authAction')}
              </Button>
              <Button variant="secondary" onPress={openExplore}>
                {t('playgrounds.bookings.segment.explore', 'Explore')}
              </Button>
            </View>
          )}
        />
      ) : bookingsLoading ? (
        <SporHiveLoader message={t('service.playgrounds.bookings.loading')} />
      ) : bookingsError ? (
        <ErrorState
          title={t('service.playgrounds.bookings.errors.title')}
          message={bookingsErrorMessage}
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
              onAction={openExplore}
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
  clusterSegmentWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  clusterSegmentTrack: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clusterSegmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
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
  authActions: {
    width: '100%',
    gap: spacing.sm,
  },
});
