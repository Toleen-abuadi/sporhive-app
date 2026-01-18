import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, CreditCard, Users } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { endpoints } from '../../services/api/endpoints';
import {
  getBookingDraft,
  getPlaygroundsClientState,
  getPublicUser,
  getPublicUserMode,
  setBookingDraft,
  setPublicUserMode,
  setPublicUser as persistPublicUser,
} from '../../services/playgrounds/storage';
import { Booking, BookingDraftStorage, PublicUser, Slot, Venue, VenueDuration } from '../../services/playgrounds/types';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

function formatSlotLabel(slot: Slot) {
  const start = slot.start || slot.start_time || '';
  const end = slot.end || slot.end_time || '';
  if (!start && !end) return 'TBD';
  if (!end) return start;
  return `${start} - ${end}`;
}

function formatMoney(amount?: number | null, currency?: string | null) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${Number(amount).toFixed(0)}`;
}

export function BookingStepperScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [durations, setDurations] = useState<VenueDuration[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<VenueDuration | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [players, setPlayers] = useState('2');
  const [paymentType, setPaymentType] = useState<'cash' | 'cliq'>('cash');
  const [cashOnDate, setCashOnDate] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [error, setError] = useState('');
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null);
  const [userMode, setUserMode] = useState<'guest' | 'registered'>('guest');
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const currency = venue?.currency || durations?.[0]?.currency || slots?.[0]?.currency || null;

  const draftPayload = useMemo<BookingDraftStorage | null>(() => {
    if (!venue?.id || !venue?.academy_profile_id) return null;
    return {
      venueId: String(venue.id),
      academyProfileId: String(venue.academy_profile_id),
      draft: {
        selectedDurationId: selectedDuration?.id ? String(selectedDuration.id) : undefined,
        bookingDate: bookingDate || undefined,
        players: Number(players) || 2,
        selectedSlot: selectedSlot
          ? { start_time: String(selectedSlot.start_time || selectedSlot.start || ''), end_time: String(selectedSlot.end_time || selectedSlot.end || '') }
          : undefined,
        paymentType,
        cashOnDate,
        currentStep,
      },
    };
  }, [bookingDate, cashOnDate, currentStep, paymentType, players, selectedDuration?.id, selectedSlot, venue?.academy_profile_id, venue?.id]);

  const loadVenue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [client, draft, mode, user] = await Promise.all([
        getPlaygroundsClientState(),
        getBookingDraft<BookingDraftStorage>(),
        getPublicUserMode(),
        getPublicUser<PublicUser>(),
      ]);
      if (mode) setUserMode(mode);
      if (user) setPublicUser(user);

      const cached = Array.isArray(client?.cachedResults) ? (client?.cachedResults as Venue[]) : [];
      const fromCache = cached.find((item) => String(item.id) === String(venueId));
      if (fromCache) setVenue(fromCache);
      if (draft?.venueId && String(draft.venueId) === String(venueId)) {
        if (draft.draft.selectedDurationId) {
          setSelectedDuration((prev) => prev || ({ id: draft.draft.selectedDurationId } as VenueDuration));
        }
        if (draft.draft.bookingDate) setBookingDate(draft.draft.bookingDate);
        if (draft.draft.players) setPlayers(String(draft.draft.players));
        if (draft.draft.paymentType) setPaymentType(draft.draft.paymentType);
        if (typeof draft.draft.cashOnDate === 'boolean') setCashOnDate(draft.draft.cashOnDate);
        if (draft.draft.currentStep) setCurrentStep(draft.draft.currentStep);
        if (draft.draft.selectedSlot) {
          setSelectedSlot({
            start_time: draft.draft.selectedSlot.start_time,
            end_time: draft.draft.selectedSlot.end_time,
          });
        }
      }
    } catch (err) {
      setError(err?.message || 'Unable to load booking data.');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  const loadDurations = useCallback(async () => {
    if (!venue?.id) return;
    try {
      const durationRes = await endpoints.playgrounds.venueDurations({ venue_id: venue.id });
      const list = Array.isArray(durationRes?.durations)
        ? durationRes.durations
        : Array.isArray(durationRes?.data?.durations)
        ? durationRes.data.durations
        : [];
      setDurations(list);
      if (!selectedDuration && list[0]) {
        setSelectedDuration(list[0]);
      }
    } catch (err) {
      setError(err?.message || 'Unable to load durations.');
    }
  }, [selectedDuration, venue?.id]);

  const loadSlots = useCallback(async () => {
    if (!venue?.id || !selectedDuration) return;
    setSlotLoading(true);
    try {
      const durationMinutes = selectedDuration.minutes || selectedDuration.duration_minutes || 60;
      const slotRes = await endpoints.playgrounds.slots({
        venue_id: venue.id,
        date: bookingDate || undefined,
        duration_minutes: durationMinutes,
      });
      const list = Array.isArray(slotRes?.slots)
        ? slotRes.slots
        : Array.isArray(slotRes?.data?.slots)
        ? slotRes.data.slots
        : [];
      setSlots(list);
    } catch (err) {
      setError(err?.message || 'Unable to load slots.');
    } finally {
      setSlotLoading(false);
    }
  }, [bookingDate, selectedDuration, venue?.id]);

  useEffect(() => {
    loadVenue();
  }, [loadVenue]);

  useEffect(() => {
    loadDurations();
  }, [loadDurations]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    if (draftPayload) {
      setBookingDraft(draftPayload);
    }
  }, [draftPayload]);

  useEffect(() => {
    setPublicUserMode(userMode);
  }, [userMode]);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleBook = useCallback(async () => {
    if (!venue?.id || !bookingDate || !selectedSlot || !selectedDuration) {
      setError('Please complete all booking steps.');
      return;
    }
    if (userMode === 'registered' && !publicUser?.id) {
      if (draftPayload) {
        await setBookingDraft({ ...draftPayload, draft: { ...draftPayload.draft, currentStep } });
      }
      router.push('/playgrounds/auth');
      return;
    }
    let activeUser = publicUser;
    if (userMode === 'guest' && !activeUser?.id) {
      if (!guestFirstName || !guestLastName || !guestPhone) {
        setError('Please provide guest details.');
        return;
      }
      try {
        const res = await endpoints.publicUsers.quickRegister({
          first_name: guestFirstName,
          last_name: guestLastName,
          phone: guestPhone,
        });
        const user = res?.user || res?.data?.user || res?.data || res;
        if (!user?.id) {
          setError('Unable to register guest.');
          return;
        }
        activeUser = user;
        await persistPublicUser(user);
        setPublicUser(user);
      } catch (err) {
        setError(err?.message || 'Unable to register guest.');
        return;
      }
    }
    if (!activeUser?.id) {
      setError('Please sign in to complete booking.');
      return;
    }
    const formData = new FormData();
    if (venue.academy_profile_id) {
      formData.append('academy_profile_id', String(venue.academy_profile_id));
    }
    if (venue.activity_id) {
      formData.append('activity_id', String(venue.activity_id));
    }
    formData.append('user_id', String(activeUser.id));
    formData.append('venue_id', String(venue.id));
    formData.append('duration_id', String(selectedDuration.id));
    formData.append('booking_date', bookingDate);
    formData.append('start_time', String(selectedSlot.start_time || selectedSlot.start || ''));
    formData.append('number_of_players', String(Number(players) || 2));
    formData.append('payment_type', paymentType);
    formData.append('cash_payment_on_date', cashOnDate ? 'true' : 'false');

    try {
      const res: Booking = await endpoints.playgrounds.createBooking(formData);
      await setBookingDraft(null);
      router.replace('/playgrounds/bookings');
      if (res?.booking_code) {
        setError(`Booking confirmed: ${res.booking_code}`);
      }
    } catch (err) {
      setError(err?.message || 'Unable to complete booking.');
    }
  }, [
    bookingDate,
    cashOnDate,
    currentStep,
    draftPayload,
    guestFirstName,
    guestLastName,
    guestPhone,
    paymentType,
    players,
    publicUser?.id,
    router,
    selectedDuration,
    selectedSlot,
    userMode,
    venue?.academy_profile_id,
    venue?.activity_id,
    venue?.id,
  ]);

  return (
    <Screen safe>
      <AppHeader title="Complete booking" />
      {loading ? (
        <LoadingState message="Preparing your booking..." />
      ) : error ? (
        <ErrorState title="Booking issue" message={error} onAction={loadVenue} />
      ) : venue ? (
        <View style={styles.container}>
          <View style={styles.stepHeader}>
            <Text variant="bodySmall" weight="semibold">
              Step {currentStep} of 3
            </Text>
            <Text variant="h4" weight="semibold">
              {venue.name || venue.title || 'Playground'}
            </Text>
          </View>

          {currentStep === 1 ? (
            <View style={styles.stepSection}>
              <View style={styles.sectionTitle}>
                <CalendarDays size={16} color={colors.textMuted} />
                <Text variant="bodySmall" weight="semibold">
                  Date & duration
                </Text>
              </View>
              <Input
                label="Booking date"
                value={bookingDate}
                onChangeText={setBookingDate}
                placeholder="YYYY-MM-DD"
                leftIcon="calendar"
                accessibilityLabel="Booking date"
              />
              <Input
                label="Players"
                value={players}
                onChangeText={setPlayers}
                placeholder="2"
                leftIcon="users"
                keyboardType="number-pad"
                accessibilityLabel="Number of players"
              />
              <View style={styles.chipsWrap}>
                {durations.length ? (
                  durations.map((duration) => (
                    <Chip
                      key={String(duration.id ?? duration.label ?? duration.minutes)}
                      label={duration.label || `${duration.minutes || duration.duration_minutes || 60} min`}
                      selected={selectedDuration?.id === duration.id}
                      onPress={() => setSelectedDuration(duration)}
                    />
                  ))
                ) : (
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    No durations listed.
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          {currentStep === 2 ? (
            <View style={styles.stepSection}>
              <View style={styles.sectionTitle}>
                <Users size={16} color={colors.textMuted} />
                <Text variant="bodySmall" weight="semibold">
                  Select a slot
                </Text>
              </View>
              {slotLoading ? (
                <LoadingState message="Loading slots..." size="small" />
              ) : slots.length ? (
                <FlatList
                  data={slots}
                  keyExtractor={(item, index) => String(item.id ?? index)}
                  numColumns={2}
                  columnWrapperStyle={{ gap: spacing.sm }}
                  contentContainerStyle={{ gap: spacing.sm }}
                  renderItem={({ item }) => (
                    <Chip
                      label={formatSlotLabel(item)}
                      selected={
                        selectedSlot?.id
                          ? selectedSlot?.id === item.id
                          : formatSlotLabel(selectedSlot || ({} as Slot)) === formatSlotLabel(item)
                      }
                      onPress={() => setSelectedSlot(item)}
                    />
                  )}
                />
              ) : (
                <EmptyState title="No slots" message="Try another date or duration." />
              )}
            </View>
          ) : null}

          {currentStep === 3 ? (
            <View style={styles.stepSection}>
              <View style={styles.sectionTitle}>
                <CreditCard size={16} color={colors.textMuted} />
                <Text variant="bodySmall" weight="semibold">
                  Payment
                </Text>
              </View>
              <View style={styles.chipsWrap}>
                <Chip
                  label="Guest"
                  selected={userMode === 'guest'}
                  onPress={() => setUserMode('guest')}
                />
                <Chip
                  label="Registered"
                  selected={userMode === 'registered'}
                  onPress={() => setUserMode('registered')}
                />
              </View>
              {userMode === 'guest' && !publicUser ? (
                <View style={styles.guestForm}>
                  <Input
                    label="First name"
                    value={guestFirstName}
                    onChangeText={setGuestFirstName}
                    placeholder="First name"
                    accessibilityLabel="Guest first name"
                  />
                  <Input
                    label="Last name"
                    value={guestLastName}
                    onChangeText={setGuestLastName}
                    placeholder="Last name"
                    accessibilityLabel="Guest last name"
                  />
                  <Input
                    label="Phone"
                    value={guestPhone}
                    onChangeText={setGuestPhone}
                    placeholder="+962..."
                    keyboardType="phone-pad"
                    accessibilityLabel="Guest phone number"
                  />
                </View>
              ) : null}
              {userMode === 'registered' && !publicUser ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Sign in required to complete booking.
                </Text>
              ) : null}
              <View style={styles.chipsWrap}>
                <Chip label="Cash" selected={paymentType === 'cash'} onPress={() => setPaymentType('cash')} />
                <Chip label="CliQ" selected={paymentType === 'cliq'} onPress={() => setPaymentType('cliq')} />
              </View>
              <View style={styles.chipsWrap}>
                <Chip
                  label="Pay on date"
                  selected={cashOnDate}
                  onPress={() => setCashOnDate(true)}
                />
                <Chip
                  label="Pay now"
                  selected={!cashOnDate}
                  onPress={() => setCashOnDate(false)}
                />
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Summary
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {bookingDate || 'Date'} • {selectedDuration?.label || 'Duration'}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {selectedSlot ? formatSlotLabel(selectedSlot) : 'Select a slot'}
                </Text>
                <Text variant="h4" weight="bold">
                  {formatMoney(selectedDuration?.price, currency) || '--'}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Button variant="secondary" onPress={handleBack} disabled={currentStep === 1}>
              Back
            </Button>
            {currentStep < 3 ? (
              <Button
                onPress={handleNext}
                disabled={(currentStep === 1 && !bookingDate) || (currentStep === 2 && !selectedSlot)}
              >
                Continue
              </Button>
            ) : (
              <Button onPress={handleBook} disabled={userMode === 'registered' && !publicUser?.id}>
                Confirm booking
              </Button>
            )}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  stepHeader: {
    gap: spacing.xs,
  },
  stepSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    ...shadows.sm,
  },
  guestForm: {
    gap: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: 'auto',
  },
});
