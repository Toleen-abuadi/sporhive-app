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
import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { AppScreen } from '../../components/ui/AppScreen';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { getPublicUser } from '../../services/playgrounds/storage';
import { usePlaygroundsActions, usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { borderRadius, shadows, spacing } from '../../theme/tokens';
import { useAuth } from '../../services/auth/auth.store';
import { getPlaygroundsAuthHeaders } from '../../services/auth/authHeaders';

const QUICK_PLAYER_SUGGESTIONS = [2, 4, 6, 8];
const CURRENCY = 'JOD';

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatSlotLabel(slot, t) {
  const start = slot?.start_time || slot?.start || '';
  const end = slot?.end_time || slot?.end || '';
  if (!start && !end) return t('service.playgrounds.common.timeTbd');
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

function StepperHeader({ currentStep, onBack, colors, stepLabels, t }) {
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
          accessibilityLabel={t('service.playgrounds.booking.actions.backAccessibility')}
        >
          <Text variant="bodySmall" weight="semibold">
            {t('service.playgrounds.booking.actions.back')}
          </Text>
        </Pressable>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {t('service.playgrounds.booking.stepCounter', {
            current: currentStep + 1,
            total: stepLabels.length,
          })}
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
              width: `${((currentStep + 1) / stepLabels.length) * 100}%`,
            },
          ]}
        />
      </View>
      <View style={styles.stepLabelRow}>
        {stepLabels.map((label, index) => {
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
  colors,
  stepLabels,
  t,
}) {
  const primaryLabel =
    currentStep < stepLabels.length - 1
      ? t('service.playgrounds.booking.actions.continue')
      : t('service.playgrounds.booking.actions.confirm');

  return (
    <View
      style={[
        styles.stickyFooter,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
      ]}
    >
      <View>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {t('service.playgrounds.booking.summary.total')}
        </Text>
        <Text variant="bodySmall" weight="semibold">
          {priceLabel || t('service.playgrounds.common.placeholder')}
        </Text>
      </View>
      <View style={styles.footerButtons}>
        <Button variant="secondary" onPress={onBack} disabled={disableBack}>
          {t('service.playgrounds.booking.actions.back')}
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
  const { t } = useTranslation();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();
  const toast = useToast();
  const { session } = useAuth();

  const [venue, setVenue] = useState(null);
  const [publicUser, setPublicUser] = useState(null);

  const [durations, setDurations] = useState([]);
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

  const { bookingDraft, durationsLoading } = usePlaygroundsStore((state) => ({
    bookingDraft: state.bookingDraft,
    durationsLoading: state.durationsLoading,
  }));
  const {
    hydrate,
    getVenueDetails,
    getVenueDurations,
    listAvailableSlots,
    listBookings,
    createBooking,
    setBookingDraft: persistBookingDraft,
  } = usePlaygroundsActions();

  const loadVenue = useCallback(async () => {
    setLoading(true);
    setErrorText('');
    try {
      const [draft, user] = await Promise.all([Promise.resolve(bookingDraft), getPublicUser()]);
      if (user) setPublicUser(user);

      const res = await getVenueDetails(venueId);
      if (res?.success && res.data) {
        setVenue(res.data);
      } else {
        setErrorText(res?.error?.message || t('service.playgrounds.venue.errors.notFound'));
      }

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
      setErrorText(err?.message || t('service.playgrounds.booking.errors.loadDraft'));
    } finally {
      setLoading(false);
    }
  }, [bookingDraft, getVenueDetails, t, venueId]);

  const loadDurations = useCallback(async () => {
    if (!venue?.id) return;
    setErrorText('');
    try {
      const durationRes = await getVenueDurations(venue.id, {
        activityId: venue.activity_id,
        academyProfileId: venue.academy_profile_id,
      });
      const list = Array.isArray(durationRes?.data)
        ? durationRes.data
        : Array.isArray(durationRes?.data?.durations)
        ? durationRes.data.durations
        : Array.isArray(durationRes?.durations)
        ? durationRes.durations
        : Array.isArray(durationRes?.data)
        ? durationRes.data
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
      setErrorText(err?.message || t('service.playgrounds.booking.errors.loadDurations'));
    }
  }, [getVenueDurations, selectedDurationId, t, venue?.academy_profile_id, venue?.activity_id, venue?.id]);

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
        const slotRes = await listAvailableSlots({
          venueId: venue.id,
          date: dateValue,
          durationId: durationValue,
          number_of_players: players,
          activity_id: venue.activity_id,
          academy_profile_id: venue.academy_profile_id,
        });
        const list = Array.isArray(slotRes?.data) ? slotRes.data : slotRes?.slots || [];
        setSlots(list || []);
      } catch (err) {
        setSlots([]);
        setSelectedSlot(null);
        setErrorText(err?.message || t('service.playgrounds.booking.errors.loadSlots'));
      } finally {
        setSlotsLoading(false);
      }
    },
    [listAvailableSlots, players, t, venue?.academy_profile_id, venue?.activity_id, venue?.id]
  );

  useEffect(() => {
    hydrate();
    loadVenue();
  }, [hydrate, loadVenue]);

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
    loadSlots(bookingDate, selectedDurationId);
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
    persistBookingDraft(draftPayload);
  }, [draftPayload, persistBookingDraft]);

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

  const stepLabels = useMemo(
    () => [
      t('service.playgrounds.booking.steps.schedule'),
      t('service.playgrounds.booking.steps.players'),
      t('service.playgrounds.booking.steps.payment'),
      t('service.playgrounds.booking.steps.review'),
    ],
    [t]
  );

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
      setInlinePaymentError(t('service.playgrounds.booking.payment.uploadRequired'));
      return;
    }
    setInlinePaymentError('');
    setCurrentStep((prev) => Math.min(prev + 1, stepLabels.length - 1));
  }, [cliqImage, currentStep, paymentType, stepLabels.length, t]);

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
      setErrorText(t('service.playgrounds.booking.errors.completeSteps'));
      return;
    }

    if (!publicUser?.id) {
      if (draftPayload) await setBookingDraft(draftPayload);
      router.push('/playgrounds/auth?fromBooking=1');
      return;
    }

    if (paymentType === 'cliq' && !cliqImage) {
      setCurrentStep(2);
      setInlinePaymentError(t('service.playgrounds.booking.payment.uploadRequired'));
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

      const res = await createBooking(formData);

      await persistBookingDraft(null);

      if (publicUser?.id) {

       await listBookings({ user_id: publicUser.id });
      }

      toast.success(t('service.playgrounds.booking.success.toastMessage'), {
        title: t('service.playgrounds.booking.success.toastTitle'),
      });
      setBookingResult(res?.data || res || null);
      setBookingSuccess(true);
      setTimeout(() => {
        router.replace('/playgrounds/bookings');
      }, 30000);
    } catch (err) {
      setErrorText(err?.message || t('service.playgrounds.booking.errors.submit'));
    } finally {
      setSubmitting(false);
    }
  }, [
    allValid,
    bookingDate,
    cashOnDate,
    cliqImage,
    createBooking,
    draftPayload,
    listBookings,
    paymentType,
    persistBookingDraft,
    players,
    publicUser?.id,
    router,
    selectedDuration,
    selectedSlot,
    t,
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
      ? t('service.playgrounds.booking.titles.schedule')
      : currentStep === 1
      ? t('service.playgrounds.booking.titles.players')
      : currentStep === 2
      ? t('service.playgrounds.booking.titles.payment')
      : t('service.playgrounds.booking.titles.review');

  const priceLabel =
    basePrice !== null && basePrice !== undefined
      ? `${basePrice} ${CURRENCY}`
      : t('service.playgrounds.common.placeholder');

  if (loading) {
    return (
      <AppScreen safe>
        <SporHiveLoader message={t('service.playgrounds.booking.loading')} />
      </AppScreen>
    );
  }

  if (errorText && !venue) {
    return (
      <AppScreen safe>
        <ErrorState
          title={t('service.playgrounds.booking.errors.title')}
          message={errorText}
          onAction={loadVenue}
        />
      </AppScreen>
    );
  }

  if (!venue) {
    return (
      <AppScreen safe>
        <EmptyState
          title={t('service.playgrounds.booking.empty.title')}
          message={t('service.playgrounds.booking.empty.message')}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen safe>
      <StepperHeader
        currentStep={currentStep}
        onBack={handleBackStep}
        colors={colors}
        stepLabels={stepLabels}
        t={t}
      />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {venue?.academy_profile?.public_name || t('service.playgrounds.common.academy')}
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
                {t('service.playgrounds.booking.schedule.duration')}
              </Text>
            </View>
            {durationsLoading ? (
              <SporHiveLoader
                message={t('service.playgrounds.booking.schedule.loadingDurations')}
                size={72}
                style={styles.inlineLoader}
                contentStyle={styles.inlineLoaderContent}
              />
            ) : durations.length === 0 ? (
              <EmptyState
                title={t('service.playgrounds.booking.schedule.noDurationsTitle')}
                message={t('service.playgrounds.booking.schedule.noDurationsMessage')}
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
                          {t('service.playgrounds.booking.schedule.minutesLabel', { minutes })}
                        </Text>
                        {duration.is_default ? (
                          <Text
                            variant="caption"
                            color={colors.accentOrange}
                            weight="semibold"
                          >
                            {t('service.playgrounds.booking.schedule.mostPopular')}
                          </Text>
                        ) : null}
                      </View>
                      <Text variant="bodySmall" color={colors.textSecondary}>
                        {duration.base_price !== null &&
                        duration.base_price !== undefined
                          ? `${Number(duration.base_price)} ${CURRENCY}`
                          : t('service.playgrounds.booking.schedule.priceOnRequest')}
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
                {t('service.playgrounds.booking.schedule.date')}
              </Text>
            </View>
            <Input
              label={t('service.playgrounds.booking.schedule.bookingDate')}
              value={bookingDate}
              onChangeText={handleSelectDate}
              placeholder={t('service.playgrounds.booking.schedule.bookingDatePlaceholder')}
              accessibilityLabel={t('service.playgrounds.booking.schedule.bookingDateAccessibility')}
            />
            <View style={styles.quickDateRow}>
              {quickDates.map((dateValue, index) => {
                const isSelected = bookingDate === dateValue;
                const label =
                  index === 0
                    ? t('service.playgrounds.booking.schedule.today')
                    : index === 1
                    ? t('service.playgrounds.booking.schedule.tomorrow')
                    : dateValue;
                return (
                  <Chip
                    key={dateValue}
                    label={label}
                    selected={isSelected}
                    onPress={() => handleSelectDate(dateValue)}
                    accessibilityLabel={t('service.playgrounds.booking.schedule.selectDateAccessibility', {
                      date: dateValue,
                    })}
                  />
                );
              })}
            </View>

            <View style={styles.sectionHeaderRow}>
              <CalendarDays size={18} color={colors.textMuted} />
              <Text variant="bodySmall" weight="semibold">
                {t('service.playgrounds.booking.schedule.availableSlots')}
              </Text>
            </View>
            {!selectedDurationId ? (
              <EmptyState
                title={t('service.playgrounds.booking.schedule.selectDurationTitle')}
                message={t('service.playgrounds.booking.schedule.selectDurationMessage')}
              />
            ) : slotsLoading ? (
              <SporHiveLoader
                message={t('service.playgrounds.booking.schedule.loadingSlots')}
                size={72}
                style={styles.inlineLoader}
                contentStyle={styles.inlineLoaderContent}
              />
            ) : !bookingDate ? (
              <EmptyState
                title={t('service.playgrounds.booking.schedule.pickDateTitle')}
                message={t('service.playgrounds.booking.schedule.pickDateMessage')}
              />
            ) : slots.length === 0 ? (
              <EmptyState
                title={t('service.playgrounds.booking.schedule.noSlotsTitle')}
                message={t('service.playgrounds.booking.schedule.noSlotsMessage')}
              />
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot, index) => {
                  const slotKey = slot.id ? String(slot.id) : `${index}`;
                  const label = formatSlotLabel(slot, t);
                  const isSelected = selectedSlot?.id
                    ? selectedSlot.id === slot.id
                    : formatSlotLabel(selectedSlot || {}, t) === label;
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
                {t('service.playgrounds.booking.players.title')}
              </Text>
            </View>
            <View
              style={[
                styles.playersDisplay,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text variant="caption" color={colors.textSecondary}>
                {t('service.playgrounds.booking.players.label')}
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
              {t('service.playgrounds.booking.players.allowedRange', {
                min: minPlayers,
                max: maxPlayers,
              })}
            </Text>
            <Input
              label={t('service.playgrounds.booking.players.inputLabel')}
              value={String(players)}
              onChangeText={handlePlayersChange}
              placeholder={t('service.playgrounds.booking.players.placeholder')}
              keyboardType="number-pad"
              accessibilityLabel={t('service.playgrounds.booking.players.accessibilityLabel')}
            />
            <View style={styles.quickPlayersRow}>
              {QUICK_PLAYER_SUGGESTIONS.map((count) => (
                <Chip
                  key={count}
                  label={t('service.playgrounds.booking.players.countLabel', { count })}
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
                {t('service.playgrounds.booking.payment.title')}
              </Text>
            </View>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('service.playgrounds.booking.payment.subtitle')}
            </Text>
            <View style={styles.chipsWrap}>
              {allowCash ? (
                <Chip
                  label={t('service.playgrounds.booking.payment.cash')}
                  selected={paymentType === 'cash'}
                  onPress={() => setPaymentType('cash')}
                />
              ) : null}
              {allowCliq ? (
                <Chip
                  label={t('service.playgrounds.booking.payment.cliq')}
                  selected={paymentType === 'cliq'}
                  onPress={() => setPaymentType('cliq')}
                />
              ) : null}
            </View>
            {paymentType === 'cash' ? (
              <View
                style={[
                  styles.paymentDetailCard,
                  {
                    backgroundColor: colors.accentOrangeSoft,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text variant="bodySmall" weight="semibold">
                  {t('service.playgrounds.booking.payment.cashTitle')}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.payment.cashSubtitle')}
                </Text>
                {allowCashOnDate ? (
                  <View style={styles.chipsWrap}>
                    <Chip
                      label={t('service.playgrounds.booking.payment.payOnDate')}
                      selected={cashOnDate}
                      onPress={() => setCashOnDate(true)}
                    />
                    <Chip
                      label={t('service.playgrounds.booking.payment.payNow')}
                      selected={!cashOnDate}
                      onPress={() => setCashOnDate(false)}
                    />
                  </View>
                ) : (
                  <Text variant="caption" color={colors.textSecondary}>
                    {t('service.playgrounds.booking.payment.cashOnDateUnavailable')}
                  </Text>
                )}
              </View>
            ) : null}
            {paymentType === 'cliq' ? (
              <View
                style={[
                  styles.paymentDetailCard,
                  {
                    backgroundColor: colors.accentOrangeSoft,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text variant="bodySmall" weight="semibold">
                  {t('service.playgrounds.booking.payment.cliqTitle')}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.payment.cliqSubtitle')}
                </Text>
                {(cliqName || cliqNumber) && (
                  <View style={styles.cliqDetails}>
                    {cliqName ? (
                      <Text variant="bodySmall">
                        {t('service.playgrounds.booking.payment.cliqName', { name: cliqName })}
                      </Text>
                    ) : null}
                    {cliqNumber ? (
                      <Text variant="bodySmall">
                        {t('service.playgrounds.booking.payment.cliqNumber', { number: cliqNumber })}
                      </Text>
                    ) : null}
                  </View>
                )}
                <Button variant="secondary" onPress={handlePickCliqImage}>
                  {t('service.playgrounds.booking.payment.uploadScreenshot')}
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
                {t('service.playgrounds.booking.review.title')}
              </Text>
            </View>
            <View
              style={[
                styles.summaryCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
            >
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.review.labels.venue')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {venue.name || t('service.playgrounds.common.venue')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.review.labels.academy')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {academy?.public_name || t('service.playgrounds.common.academy')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.review.labels.date')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {bookingDate || t('service.playgrounds.common.placeholder')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.review.labels.time')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {selectedSlot
                    ? formatSlotLabel(selectedSlot, t)
                    : t('service.playgrounds.common.placeholder')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.review.labels.duration')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {selectedDuration
                    ? t('service.playgrounds.booking.schedule.minutesLabel', {
                        minutes:
                          selectedDuration.minutes ||
                          selectedDuration.duration_minutes ||
                          60,
                      })
                    : t('service.playgrounds.common.placeholder')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.review.labels.players')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {players}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.review.labels.payment')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {paymentType === 'cash'
                    ? t('service.playgrounds.booking.payment.cash')
                    : t('service.playgrounds.booking.payment.cliq')}
                  {paymentType === 'cash' && allowCashOnDate
                    ? cashOnDate
                      ? ` ${t('service.playgrounds.booking.payment.payOnDateSuffix')}`
                      : ` ${t('service.playgrounds.booking.payment.payNowSuffix')}`
                    : ''}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.review.labels.price')}
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
                  {
                    borderColor: colors.accentOrange,
                    backgroundColor: colors.accentOrangeSoft,
                  },
                ]}
              >
                <Text variant="bodySmall" weight="semibold">
                  {t('service.playgrounds.booking.success.title')}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.success.message')}
                </Text>

                {bookingResult?.booking_code ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text variant="caption" color={colors.textSecondary}>
                      {t('service.playgrounds.booking.success.codeLabel')}
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
                    {t('service.playgrounds.booking.success.viewBookings')}
                  </Button>
                  <Button onPress={() => router.back()}>
                    {t('service.playgrounds.booking.success.done')}
                  </Button>
                </View>
              </View>
            ) : null}
            {errorText ? (
              <View
                style={[
                  styles.errorCard,
                  { borderColor: colors.error, backgroundColor: colors.surfaceElevated },
                ]}
              >
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
            : currentStep < stepLabels.length - 1
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
        colors={colors}
        stepLabels={stepLabels}
        t={t}
      />
    </AppScreen>
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
    borderWidth: 1,
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
  },
  inlineLoader: {
    flex: 0,
    paddingVertical: spacing.lg,
  },
  inlineLoaderContent: {
    paddingHorizontal: spacing.lg,
  },
  stickyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  successCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },

});
