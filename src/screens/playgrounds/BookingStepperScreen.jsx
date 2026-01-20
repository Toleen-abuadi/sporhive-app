import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarDays,
  Check,
  CreditCard,
  Moon,
  Sun,
  Users,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useToast } from '../../components/ui/ToastHost';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { Skeleton } from '../../components/ui/Skeleton';
import { endpoints } from '../../services/api/endpoints';
import {
  getBookingDraft,
  getPlaygroundsClientState,
  getPublicUser,
  setBookingDraft,
} from '../../services/playgrounds/storage';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

const STEP_LABELS = ['Schedule', 'Players', 'Payment', 'Review'];
const QUICK_PLAYER_SUGGESTIONS = [2, 4, 6, 8];
const CURRENCY = 'JOD';

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatSlotLabel(slot) {
  const start = slot?.start_time || slot?.start || '';
  const end = slot?.end_time || slot?.end || '';
  if (!start && !end) return 'TBD';
  if (!end) return start;
  return `${start} - ${end}`;
}

function getSlotPhase(startTime) {
  if (!startTime) return 'day';
  const [hour] = startTime.split(':');
  const parsedHour = Number(hour);
  return parsedHour >= 6 && parsedHour < 18 ? 'day' : 'night';
}

function buildDraftPayload(venueId, state) {
  if (!venueId) return null;
  return {
    venueId: String(venueId),
    draft: state,
  };
}

function StepperHeader({ currentStep, onBack, colors }) {
  return (
    <View style={styles.stepperHeader}>
      <View style={styles.stepperTopRow}>
        <Pressable
          onPress={onBack}
          disabled={currentStep === 0}
          style={({ pressed }) => [
            styles.backButton,
            {
              opacity: currentStep === 0 ? 0.4 : 1,
              backgroundColor: pressed
                ? colors.surfaceElevated
                : colors.surface,
              borderColor: colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text variant="bodySmall" weight="semibold">
            Back
          </Text>
        </Pressable>
        <Text variant="bodySmall" color={colors.textSecondary}>
          Step {currentStep + 1} of {STEP_LABELS.length}
        </Text>
      </View>
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.surfaceElevated },
        ]}
      >
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.accentOrange,
              width: `${((currentStep + 1) / STEP_LABELS.length) * 100}%`,
            },
          ]}
        />
      </View>
      <View style={styles.stepLabelRow}>
        {STEP_LABELS.map((label, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          return (
            <View key={label} style={styles.stepLabelItem}>
              <View
                style={[
                  styles.stepLabelDot,
                  {
                    backgroundColor: isDone
                      ? colors.accentOrange
                      : isActive
                      ? colors.surface
                      : colors.surfaceElevated,
                    borderColor:
                      isActive || isDone ? colors.accentOrange : colors.border,
                  },
                ]}
              >
                {isDone ? (
                  <Check size={12} color={colors.surface} />
                ) : (
                  <Text
                    variant="bodySmall"
                    weight="semibold"
                    color={isActive ? colors.accentOrange : colors.textMuted}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                variant="caption"
                color={
                  isActive || isDone ? colors.textPrimary : colors.textSecondary
                }
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StickyFooterCTA({
  onBack,
  onNext,
  currentStep,
  priceLabel,
  disableBack,
  disableNext,
  submitting,
}) {
  const primaryLabel =
    currentStep < STEP_LABELS.length - 1 ? 'Continue' : 'Confirm booking';

  return (
    <View style={styles.stickyFooter}>
      <View>
        <Text variant="bodySmall" color="#8A8A8A">
          Total
        </Text>
        <Text variant="bodySmall" weight="semibold">
          {priceLabel || '--'}
        </Text>
      </View>
      <View style={styles.footerButtons}>
        <Button variant="secondary" onPress={onBack} disabled={disableBack}>
          Back
        </Button>
        <Button onPress={onNext} disabled={disableNext} loading={submitting}>
          {primaryLabel}
        </Button>
      </View>
    </View>
  );
}

export function BookingStepperScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();
  const toast = useToast();

  const [venue, setVenue] = useState(null);
  const [publicUser, setPublicUser] = useState(null);

  const [durations, setDurations] = useState([]);
  const [durationsLoading, setDurationsLoading] = useState(false);
  const [selectedDurationId, setSelectedDurationId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [players, setPlayers] = useState(2);
  const [paymentType, setPaymentType] = useState('cash');
  const [cashOnDate, setCashOnDate] = useState(false);
  const [cliqImage, setCliqImage] = useState(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [inlinePaymentError, setInlinePaymentError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null); // {booking_id, booking_code, total_price, ...}

  const academy = venue?.academy_profile || null;
  const allowCash =
    typeof academy?.allow_cash === 'boolean' ? academy.allow_cash : true;
  const allowCashOnDate = !!academy?.allow_cash_on_date;
  const allowCliq = !!academy?.allow_cliq;
  const cliqName = academy?.cliq_name || '';
  const cliqNumber = academy?.cliq_number || '';

  const minPlayers = venue?.min_players ?? 1;
  const maxPlayers = venue?.max_players ?? 100;

  const selectedDuration = useMemo(
    () =>
      durations.find(
        (duration) => String(duration.id) === String(selectedDurationId)
      ) || null,
    [durations, selectedDurationId]
  );

  const basePrice =
    selectedDuration?.base_price !== null &&
    selectedDuration?.base_price !== undefined
      ? Number(selectedDuration.base_price)
      : null;

  const quickDates = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index);
        return formatIsoDate(date);
      }),
    []
  );

  const scheduleReady = !!selectedDurationId && !!bookingDate && !!selectedSlot;
  const playersValid = players >= minPlayers && players <= maxPlayers;
  const paymentReady = !!paymentType && (paymentType !== 'cliq' || !!cliqImage);
  const allValid = scheduleReady && playersValid && paymentReady;

  const draftPayload = useMemo(
    () =>
      buildDraftPayload(venueId, {
        selectedDurationId: selectedDurationId || undefined,
        bookingDate: bookingDate || undefined,
        players,
        selectedSlot: selectedSlot
          ? {
              start_time: String(
                selectedSlot.start_time || selectedSlot.start || ''
              ),
              end_time: String(selectedSlot.end_time || selectedSlot.end || ''),
            }
          : undefined,
        paymentType: paymentType || undefined,
        cashOnDate,
        currentStep,
      }),
    [
      bookingDate,
      cashOnDate,
      currentStep,
      paymentType,
      players,
      selectedDurationId,
      selectedSlot,
      venueId,
    ]
  );

  const loadVenue = useCallback(async () => {
    setLoading(true);
    setErrorText('');
    try {
      const [client, draft, user] = await Promise.all([
        getPlaygroundsClientState(),
        getBookingDraft(),
        getPublicUser(),
      ]);
      if (user) setPublicUser(user);

      const cached = Array.isArray(client?.cachedResults)
        ? client.cachedResults
        : [];
      const resolvedVenue = cached.find(
        (item) => String(item.id) === String(venueId)
      );
      if (resolvedVenue) setVenue(resolvedVenue);

      if (draft?.venueId && String(draft.venueId) === String(venueId)) {
        const draftState = draft.draft || {};
        if (draftState.selectedDurationId) {
          setSelectedDurationId(String(draftState.selectedDurationId));
        }
        if (draftState.bookingDate) setBookingDate(draftState.bookingDate);
        if (draftState.players) setPlayers(Number(draftState.players) || 2);
        if (draftState.selectedSlot) {
          setSelectedSlot({
            start_time: draftState.selectedSlot.start_time,
            end_time: draftState.selectedSlot.end_time,
          });
        }
        if (draftState.paymentType) setPaymentType(draftState.paymentType);
        if (typeof draftState.cashOnDate === 'boolean') {
          setCashOnDate(draftState.cashOnDate);
        }
        if (typeof draftState.currentStep === 'number') {
          setCurrentStep(draftState.currentStep);
        }
      }
    } catch (err) {
      setErrorText(err?.message || 'Unable to load booking data.');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  const loadDurations = useCallback(async () => {
    if (!venue?.id) return;
    setDurationsLoading(true);
    setErrorText('');
    try {
      const durationRes = await endpoints.playgrounds.venueDurations({
        venue_id: venue.id,
      });
      const list = Array.isArray(durationRes?.data?.durations)
        ? durationRes.data.durations
        : Array.isArray(durationRes?.durations)
        ? durationRes.durations
        : [];

      const normalized = list.map((duration) => ({
        ...duration,
        base_price:
          duration.base_price !== null && duration.base_price !== undefined
            ? Number(duration.base_price)
            : null,
      }));

      setDurations(normalized);

      if (!selectedDurationId) {
        const defaultDuration =
          normalized.find((item) => item.is_default) || normalized[0];
        if (defaultDuration) {
          setSelectedDurationId(String(defaultDuration.id));
        }
      }
    } catch (err) {
      setErrorText(err?.message || 'Unable to load durations.');
    } finally {
      setDurationsLoading(false);
    }
  }, [selectedDurationId, venue?.id]);

  const loadSlots = useCallback(
    async (dateValue, durationValue) => {
      if (!venue?.id) return;
      if (!dateValue || !durationValue) return;
      setSlotsLoading(true);
      setSlots([]);
      setSelectedSlot(null);
      setInlinePaymentError('');
      setErrorText('');

      try {
        const slotRes = await endpoints.playgrounds.slots({
          venue_id: venue.id,
          date: dateValue,
          duration_minutes: durationValue,
        });

        const list = Array.isArray(slotRes?.slots)
          ? slotRes.slots
          : Array.isArray(slotRes?.data?.slots)
          ? slotRes.data.slots
          : [];

        setSlots(list);
      } catch (err) {
        setSlots([]);
        setSelectedSlot(null);
        setErrorText(err?.message || 'Unable to load slots.');
      } finally {
        setSlotsLoading(false);
      }
    },
    [venue?.id]
  );

  useEffect(() => {
    loadVenue();
  }, [loadVenue]);

  useEffect(() => {
    if (!venue?.id) return;
    loadDurations();
  }, [loadDurations, venue?.id]);

  useEffect(() => {
    if (!bookingDate || !selectedDurationId) return;
    const durationObj = durations.find(
      (duration) => String(duration.id) === String(selectedDurationId)
    );
    if (!durationObj) return;
    const minutes = durationObj.minutes || durationObj.duration_minutes || 60;
    loadSlots(bookingDate, minutes);
  }, [bookingDate, durations, loadSlots, selectedDurationId]);

  useEffect(() => {
    if (!selectedDurationId) return;
    const durationObj = durations.find(
      (duration) => String(duration.id) === String(selectedDurationId)
    );
    if (!durationObj) return;
    setSelectedSlot(null);
    setSlots([]);
  }, [selectedDurationId, durations]);

  useEffect(() => {
    if (!draftPayload) return;
    setBookingDraft(draftPayload);
  }, [draftPayload]);

  useEffect(() => {
    if (!allowCliq && paymentType === 'cliq') {
      setPaymentType('cash');
    }
    if (!allowCash && allowCliq) {
      setPaymentType('cliq');
    }
    if (!allowCash && !allowCliq) {
      setPaymentType('cash');
    }
    if (!allowCashOnDate && cashOnDate) {
      setCashOnDate(false);
    }
  }, [allowCash, allowCashOnDate, allowCliq, cashOnDate, paymentType]);

  const handleSelectDuration = useCallback((id) => {
    setSelectedDurationId(String(id));
    setSelectedSlot(null);
    setSlots([]);
  }, []);

  const handleSelectDate = useCallback((dateValue) => {
    setBookingDate(dateValue);
    setSelectedSlot(null);
    setSlots([]);
  }, []);

  const handleNextStep = useCallback(() => {
    if (currentStep === 2 && paymentType === 'cliq' && !cliqImage) {
      setInlinePaymentError('Upload your CliQ screenshot to continue.');
      return;
    }
    setInlinePaymentError('');
    setCurrentStep((prev) => Math.min(prev + 1, STEP_LABELS.length - 1));
  }, [cliqImage, currentStep, paymentType]);

  const handleBackStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handlePickCliqImage = useCallback(async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.[0]) {
      setCliqImage(res.assets[0]);
      setInlinePaymentError('');
    }
  }, []);

  const handleSubmitBooking = useCallback(async () => {
    if (!allValid || !selectedDuration || !selectedSlot) {
      setErrorText('Please complete all booking steps.');
      return;
    }

    if (!publicUser?.id) {
      if (draftPayload) await setBookingDraft(draftPayload);
      router.push('/playgrounds/auth?fromBooking=1');
      return;
    }

    if (paymentType === 'cliq' && !cliqImage) {
      setCurrentStep(2);
      setInlinePaymentError('Upload your CliQ screenshot to continue.');
      return;
    }

    setSubmitting(true);
    setErrorText('');

    try {
      const formData = new FormData();
      formData.append('academy_profile_id', venue.academy_profile_id);
      formData.append('user_id', publicUser.id);
      formData.append('activity_id', venue.activity_id);
      formData.append('venue_id', venue.id);
      formData.append('duration_id', selectedDuration.id);
      formData.append('booking_date', bookingDate);
      formData.append('start_time', selectedSlot.start_time);
      formData.append('number_of_players', String(players));
      formData.append('payment_type', paymentType);
      formData.append(
        'cash_payment_on_date',
        paymentType === 'cash' && cashOnDate ? 'true' : 'false'
      );

      if (paymentType === 'cliq' && cliqImage?.uri) {
        formData.append('cliq_image', {
          uri: cliqImage.uri,
          name: cliqImage.fileName || 'cliq.jpg',
          type: cliqImage.mimeType || 'image/jpeg',
        });
      }

      const res = await endpoints.playgrounds.createBooking(formData);

      await setBookingDraft(null);

      toast.success('Your booking request was sent.', {
        title: 'Booking confirmed',
      });
      setBookingResult(res?.data || res || null);
      setBookingSuccess(true);
      setTimeout(() => {
        router.replace('/playgrounds/bookings');
      }, 30000);
    } catch (err) {
      setErrorText(err?.message || 'Unable to complete booking.');
    } finally {
      setSubmitting(false);
    }
  }, [
    allValid,
    bookingDate,
    cashOnDate,
    cliqImage,
    draftPayload,
    paymentType,
    players,
    publicUser?.id,
    router,
    selectedDuration,
    selectedSlot,
    toast,
    venue?.academy_profile_id,
    venue?.activity_id,
    venue?.id,
  ]);

  const handlePlayersChange = useCallback((value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setPlayers(parsed);
  }, []);

  const handlePlayersIncrement = useCallback(() => {
    setPlayers((prev) => Math.min(maxPlayers, prev + 1));
  }, [maxPlayers]);

  const handlePlayersDecrement = useCallback(() => {
    setPlayers((prev) => Math.max(minPlayers, prev - 1));
  }, [minPlayers]);

  const handleSelectSlot = useCallback((slot) => {
    setSelectedSlot(slot);
  }, []);

  const stepTitle =
    currentStep === 0
      ? 'Choose date, time & duration'
      : currentStep === 1
      ? 'Number of players'
      : currentStep === 2
      ? 'Payment method'
      : 'Review & confirm';

  const priceLabel =
    basePrice !== null && basePrice !== undefined
      ? `${basePrice} ${CURRENCY}`
      : '--';

  if (loading) {
    return (
      <Screen safe>
        <LoadingState message="Preparing your booking..." />
      </Screen>
    );
  }

  if (errorText && !venue) {
    return (
      <Screen safe>
        <ErrorState
          title="Booking issue"
          message={errorText}
          onAction={loadVenue}
        />
      </Screen>
    );
  }

  if (!venue) {
    return (
      <Screen safe>
        <EmptyState
          title="Venue not found"
          message="We couldn't find this venue. Please try again."
        />
      </Screen>
    );
  }

  return (
    <Screen safe>
      <StepperHeader
        currentStep={currentStep}
        onBack={handleBackStep}
        colors={colors}
      />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {venue?.academy_profile?.public_name || 'Academy'}
          </Text>
          <Text variant="h4" weight="semibold">
            {stepTitle}
          </Text>
        </View>

        {currentStep === 0 ? (
          <View style={styles.stepSection}>
            <View style={styles.sectionHeaderRow}>
              <CalendarDays size={18} color={colors.textMuted} />
              <Text variant="bodySmall" weight="semibold">
                Duration
              </Text>
            </View>
            {durationsLoading ? (
              <View style={styles.skeletonGroup}>
                <Skeleton height={72} />
                <Skeleton height={72} />
              </View>
            ) : durations.length === 0 ? (
              <EmptyState
                title="No durations available"
                message="Please check again later or select another venue."
              />
            ) : (
              <View style={styles.durationCards}>
                {durations.map((duration) => {
                  const minutes =
                    duration.minutes || duration.duration_minutes || 60;
                  const isSelected =
                    String(duration.id) === String(selectedDurationId);
                  return (
                    <Pressable
                      key={String(duration.id)}
                      onPress={() => handleSelectDuration(duration.id)}
                      style={({ pressed }) => [
                        styles.durationCard,
                        {
                          borderColor: isSelected
                            ? colors.accentOrange
                            : colors.border,
                          backgroundColor: pressed
                            ? colors.surfaceElevated
                            : colors.surface,
                        },
                      ]}
                      accessibilityRole="button"
                    >
                      <View style={styles.durationCardTop}>
                        <Text variant="bodySmall" weight="semibold">
                          {minutes} min
                        </Text>
                        {duration.is_default ? (
                          <Text
                            variant="caption"
                            color={colors.accentOrange}
                            weight="semibold"
                          >
                            Most popular
                          </Text>
                        ) : null}
                      </View>
                      <Text variant="bodySmall" color={colors.textSecondary}>
                        {duration.base_price !== null &&
                        duration.base_price !== undefined
                          ? `${Number(duration.base_price)} ${CURRENCY}`
                          : 'Price available on request'}
                      </Text>
                      {duration.note ? (
                        <Text variant="caption" color={colors.textSecondary}>
                          {duration.note}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.sectionHeaderRow}>
              <CalendarDays size={18} color={colors.textMuted} />
              <Text variant="bodySmall" weight="semibold">
                Date
              </Text>
            </View>
            <Input
              label="Booking date"
              value={bookingDate}
              onChangeText={handleSelectDate}
              placeholder="YYYY-MM-DD"
              accessibilityLabel="Booking date"
            />
            <View style={styles.quickDateRow}>
              {quickDates.map((dateValue, index) => {
                const isSelected = bookingDate === dateValue;
                const label =
                  index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : dateValue;
                return (
                  <Chip
                    key={dateValue}
                    label={label}
                    selected={isSelected}
                    onPress={() => handleSelectDate(dateValue)}
                    accessibilityLabel={`Select ${dateValue}`}
                  />
                );
              })}
            </View>

            <View style={styles.sectionHeaderRow}>
              <CalendarDays size={18} color={colors.textMuted} />
              <Text variant="bodySmall" weight="semibold">
                Available time slots
              </Text>
            </View>
            {!selectedDurationId ? (
              <EmptyState
                title="Select a duration"
                message="Pick a duration to see available slots."
              />
            ) : slotsLoading ? (
              <View style={styles.skeletonGroup}>
                <Skeleton height={52} />
                <Skeleton height={52} />
              </View>
            ) : !bookingDate ? (
              <EmptyState
                title="Pick a date"
                message="Select a date to see available time slots."
              />
            ) : slots.length === 0 ? (
              <EmptyState
                title="No slots"
                message="No available slots for this duration on the selected date."
              />
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot, index) => {
                  const slotKey = slot.id ? String(slot.id) : `${index}`;
                  const label = formatSlotLabel(slot);
                  const isSelected = selectedSlot?.id
                    ? selectedSlot.id === slot.id
                    : formatSlotLabel(selectedSlot || {}) === label;
                  const phase = getSlotPhase(slot.start_time || slot.start);
                  return (
                    <Chip
                      key={slotKey}
                      label={label}
                      selected={isSelected}
                      icon={
                        phase === 'night' ? (
                          <Moon size={12} color={colors.textMuted} />
                        ) : (
                          <Sun size={12} color={colors.textMuted} />
                        )
                      }
                      onPress={() => handleSelectSlot(slot)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {currentStep === 1 ? (
          <View style={styles.stepSection}>
            <View style={styles.sectionHeaderRow}>
              <Users size={18} color={colors.textMuted} />
              <Text variant="bodySmall" weight="semibold">
                Players
              </Text>
            </View>
            <View
              style={[styles.playersDisplay, { borderColor: colors.border }]}
            >
              <Text variant="caption" color={colors.textSecondary}>
                Players
              </Text>
              <Text variant="h2" weight="bold">
                {players}
              </Text>
            </View>
            <View style={styles.playersStepper}>
              <Button
                variant="secondary"
                size="small"
                onPress={handlePlayersDecrement}
                disabled={players <= minPlayers}
              >
                -
              </Button>
              <Button
                variant="secondary"
                size="small"
                onPress={handlePlayersIncrement}
                disabled={players >= maxPlayers}
              >
                +
              </Button>
            </View>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Allowed range: {minPlayers} - {maxPlayers}
            </Text>
            <Input
              label="Number of players"
              value={String(players)}
              onChangeText={handlePlayersChange}
              placeholder="2"
              keyboardType="number-pad"
              accessibilityLabel="Number of players"
            />
            <View style={styles.quickPlayersRow}>
              {QUICK_PLAYER_SUGGESTIONS.map((count) => (
                <Chip
                  key={count}
                  label={`${count} players`}
                  selected={players === count}
                  onPress={() => setPlayers(count)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {currentStep === 2 ? (
          <View style={styles.stepSection}>
            <View style={styles.sectionHeaderRow}>
              <CreditCard size={18} color={colors.textMuted} />
              <Text variant="bodySmall" weight="semibold">
                Payment method
              </Text>
            </View>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Choose how you'd like to pay.
            </Text>
            <View style={styles.chipsWrap}>
              {allowCash ? (
                <Chip
                  label="Cash"
                  selected={paymentType === 'cash'}
                  onPress={() => setPaymentType('cash')}
                />
              ) : null}
              {allowCliq ? (
                <Chip
                  label="CliQ"
                  selected={paymentType === 'cliq'}
                  onPress={() => setPaymentType('cliq')}
                />
              ) : null}
            </View>
            {paymentType === 'cash' ? (
              <View style={styles.paymentDetailCard}>
                <Text variant="bodySmall" weight="semibold">
                  Pay with cash
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Settle your payment at the academy.
                </Text>
                {allowCashOnDate ? (
                  <View style={styles.chipsWrap}>
                    <Chip
                      label="Pay on booking date"
                      selected={cashOnDate}
                      onPress={() => setCashOnDate(true)}
                    />
                    <Chip
                      label="Pay now"
                      selected={!cashOnDate}
                      onPress={() => setCashOnDate(false)}
                    />
                  </View>
                ) : (
                  <Text variant="caption" color={colors.textSecondary}>
                    Cash on date is not available for this academy.
                  </Text>
                )}
              </View>
            ) : null}
            {paymentType === 'cliq' ? (
              <View style={styles.paymentDetailCard}>
                <Text variant="bodySmall" weight="semibold">
                  CliQ transfer
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Transfer to the academy and upload your screenshot.
                </Text>
                {(cliqName || cliqNumber) && (
                  <View style={styles.cliqDetails}>
                    {cliqName ? (
                      <Text variant="bodySmall">CliQ name: {cliqName}</Text>
                    ) : null}
                    {cliqNumber ? (
                      <Text variant="bodySmall">CliQ number: {cliqNumber}</Text>
                    ) : null}
                  </View>
                )}
                <Button variant="secondary" onPress={handlePickCliqImage}>
                  Upload screenshot
                </Button>
                {cliqImage?.uri ? (
                  <Image
                    source={{ uri: cliqImage.uri }}
                    style={styles.cliqPreview}
                  />
                ) : null}
                {inlinePaymentError ? (
                  <Text variant="caption" color={colors.error}>
                    {inlinePaymentError}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {currentStep === 3 ? (
          <View style={styles.stepSection}>
            <View style={styles.sectionHeaderRow}>
              <Check size={18} color={colors.textMuted} />
              <Text variant="bodySmall" weight="semibold">
                Review & confirm
              </Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Venue
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {venue.name || 'Venue'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Academy
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {academy?.public_name || 'Academy'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Date
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {bookingDate || '--'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Time
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {selectedSlot ? formatSlotLabel(selectedSlot) : '--'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Duration
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {selectedDuration
                    ? `${
                        selectedDuration.minutes ||
                        selectedDuration.duration_minutes ||
                        60
                      } min`
                    : '--'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Players
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {players}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Payment
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {paymentType}
                  {paymentType === 'cash' && allowCashOnDate
                    ? cashOnDate
                      ? ' (pay on date)'
                      : ' (pay now)'
                    : ''}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Price
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {priceLabel}
                </Text>
              </View>
            </View>
            {bookingSuccess ? (
              <View
                style={[
                  styles.successCard,
                  { borderColor: colors.accentOrange },
                ]}
              >
                <Text variant="bodySmall" weight="semibold">
                  ✅ Booking confirmed
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Your request has been submitted successfully.
                </Text>

                {bookingResult?.booking_code ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text variant="caption" color={colors.textSecondary}>
                      Booking code
                    </Text>
                    <Text variant="bodySmall" weight="semibold">
                      {bookingResult.booking_code}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={{
                    marginTop: spacing.md,
                    flexDirection: 'row',
                    gap: spacing.sm,
                  }}
                >
                  <Button
                    variant="secondary"
                    onPress={() => router.push('/playgrounds/bookings')}
                  >
                    View bookings
                  </Button>
                  <Button onPress={() => router.back()}>Done</Button>
                </View>
              </View>
            ) : null}
            {errorText ? (
              <View style={[styles.errorCard, { borderColor: colors.error }]}>
                <Text variant="bodySmall" color={colors.error}>
                  {errorText}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <StickyFooterCTA
        currentStep={currentStep}
        onBack={handleBackStep}
        onNext={
          bookingSuccess
            ? () => router.push('/playgrounds/bookings')
            : currentStep < STEP_LABELS.length - 1
            ? handleNextStep
            : handleSubmitBooking
        }
        priceLabel={priceLabel}
        disableBack={currentStep === 0}
        disableNext={
          bookingSuccess ||
          (currentStep === 0 && !scheduleReady) ||
          (currentStep === 1 && !playersValid) ||
          (currentStep === 2 && !paymentReady) ||
          (currentStep === 3 && (!allValid || submitting))
        }
        submitting={submitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  stepperHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  stepperTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  stepLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabelItem: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  stepLabelDot: {
    height: 26,
    width: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeader: {
    gap: spacing.xs,
  },
  stepSection: {
    gap: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  durationCards: {
    gap: spacing.sm,
  },
  durationCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    ...shadows.sm,
  },
  durationCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  playersDisplay: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  playersStepper: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickPlayersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paymentDetailCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 132, 0, 0.08)',
    gap: spacing.sm,
  },
  cliqDetails: {
    gap: spacing.xs,
  },
  cliqPreview: {
    height: 140,
    borderRadius: borderRadius.lg,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  errorCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 0, 0, 0.08)',
  },
  skeletonGroup: {
    gap: spacing.sm,
  },
  stickyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'white',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
    successCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 132, 0, 0.10)',
    gap: spacing.xs,
  },

});
