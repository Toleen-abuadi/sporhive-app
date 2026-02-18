// src/screens/playgrounds/BookingWizardScreen.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useToast } from '../../components/ui/ToastHost';
import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { AppScreen } from '../../components/ui/AppScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { useSmartBack } from '../../navigation/useSmartBack';

import { usePlaygroundsActions, usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { useAuth } from '../../services/auth/auth.store';

import { makeWizardStyles } from './bookingWizard.ui';
import {
  buildQuickDates,
  buildDraftPayload,
  formatSlotLabel,
  normalizeRouterParam,
  moneyLabel,
} from './bookingWizard.utils';

import { BookingWizardSteps } from './BookingWizardSteps';

const CURRENCY = 'JOD';

export function BookingWizardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeWizardStyles(colors), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const { goBack } = useSmartBack();
  const toast = useToast();
  const { session } = useAuth();

  const publicUser = session?.user || null;

  const routeParams = useLocalSearchParams();
  const venueId = useMemo(() => {
    const raw = routeParams?.venueId ?? routeParams?.venue_id ?? routeParams?.id;
    return normalizeRouterParam(raw);
  }, [routeParams]);

  const { bookingDraft, durationsLoading } = usePlaygroundsStore((s) => ({
    bookingDraft: s.bookingDraft,
    durationsLoading: s.durationsLoading,
  }));

  const {
    hydrate,
    getVenueDetails,
    getVenueDurations,
    listAvailableSlots,
    verifySlotAvailability,
    listBookings,
    createBooking,
    setBookingDraft: persistBookingDraft,
    clearBookingDraft,
  } = usePlaygroundsActions();

  // Core state
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const [venue, setVenue] = useState(null);
  const [durations, setDurations] = useState([]);
  const [selectedDurationId, setSelectedDurationId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [players, setPlayers] = useState(2);

  const [paymentType, setPaymentType] = useState('cash'); // 'cash' | 'cliq'
  const [cashOnDate, setCashOnDate] = useState(false);
  const [cliqImage, setCliqImage] = useState(null);
  const [inlinePaymentError, setInlinePaymentError] = useState('');

  const [step, setStep] = useState(0); // 0..3
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // Derived
  const academy = venue?.academy_profile || null;
  const allowCash = typeof academy?.allow_cash === 'boolean' ? academy.allow_cash : true;
  const allowCashOnDate = !!academy?.allow_cash_on_date;
  const allowCliq = !!academy?.allow_cliq;

  const cliqName = academy?.cliq_name || '';
  const cliqNumber = academy?.cliq_number || '';

  const minPlayers = venue?.min_players ?? 1;
  const maxPlayers = venue?.max_players ?? 100;

  const quickDates = useMemo(() => buildQuickDates(7), []);

  const selectedDuration = useMemo(
    () => durations.find((d) => String(d.id) === String(selectedDurationId)) || null,
    [durations, selectedDurationId],
  );

  const durationMinutes = useMemo(() => {
    const m = selectedDuration?.minutes ?? selectedDuration?.duration_minutes ?? null;
    return m != null ? Number(m) : null;
  }, [selectedDuration]);

  const basePrice = useMemo(() => {
    if (selectedDuration?.base_price === null || selectedDuration?.base_price === undefined) return null;
    return Number(selectedDuration.base_price);
  }, [selectedDuration]);

  const priceLabel = useMemo(() => moneyLabel(basePrice, CURRENCY, t), [basePrice, t]);

  // Wizard validations
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
              start_time: String(selectedSlot.start_time || selectedSlot.start || ''),
              end_time: String(selectedSlot.end_time || selectedSlot.end || ''),
            }
          : undefined,
        paymentType: paymentType || undefined,
        cashOnDate,
        step,
      }),
    [venueId, selectedDurationId, bookingDate, players, selectedSlot, paymentType, cashOnDate, step],
  );

  // -------- effects
  useEffect(() => {
    hydrate();
    loadVenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (venue?.id) loadDurations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.id]);

  useEffect(() => {
    if (bookingDate && selectedDurationId && venue?.id) loadSlots(bookingDate, selectedDurationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingDate, selectedDurationId]);

  useEffect(() => {
    if (draftPayload) persistBookingDraft(draftPayload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPayload]);

  // -------- loaders
  const restoreDraft = useCallback(
    async (venueObj) => {
      try {
        const draft = await Promise.resolve(bookingDraft);
        if (!draft?.venueId || String(draft.venueId) !== String(venueId)) return;

        const d = draft.draft || {};
        if (d.selectedDurationId) setSelectedDurationId(String(d.selectedDurationId));
        if (d.bookingDate) setBookingDate(String(d.bookingDate));
        if (typeof d.players === 'number') setPlayers(Number(d.players) || 2);
        if (d.selectedSlot?.start_time) {
          setSelectedSlot({ start_time: d.selectedSlot.start_time, end_time: d.selectedSlot.end_time });
        }
        if (d.paymentType) setPaymentType(d.paymentType);
        if (typeof d.cashOnDate === 'boolean') setCashOnDate(d.cashOnDate);
        if (typeof d.step === 'number') setStep(d.step);

        // sanity: if payment type not allowed -> auto fallback
        const acad = venueObj?.academy_profile || null;
        const cashAllowed = typeof acad?.allow_cash === 'boolean' ? acad.allow_cash : true;
        const cliqAllowed = !!acad?.allow_cliq;
        if (d.paymentType === 'cliq' && !cliqAllowed) setPaymentType(cashAllowed ? 'cash' : 'cliq');
        if (d.paymentType === 'cash' && !cashAllowed) setPaymentType(cliqAllowed ? 'cliq' : 'cash');
      } catch (e) {
        console.warn('restoreDraft failed', e);
      }
    },
    [bookingDraft, venueId],
  );

  const loadVenue = useCallback(async () => {
    setLoading(true);
    setErrorText('');
    try {
      const res = await getVenueDetails(venueId);
      if (res?.success && res?.data) {
        setVenue(res.data);
        await restoreDraft(res.data);
      } else {
        setErrorText(res?.error?.message || t('service.playgrounds.venue.errors.notFound'));
      }
    } catch (e) {
      setErrorText(e?.message || t('service.playgrounds.booking.errors.loadVenue'));
    } finally {
      setLoading(false);
    }
  }, [getVenueDetails, restoreDraft, t, venueId]);

  const loadDurations = useCallback(async () => {
    if (!venue?.id) return;
    try {
      const res = await getVenueDurations(venue.id, {
        activityId: venue.activity_id,
        academyProfileId: venue.academy_profile_id,
      });

      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.durations)
          ? res.data.durations
          : Array.isArray(res?.durations)
            ? res.durations
            : [];

      const normalized = list.map((d) => ({
        ...d,
        base_price: d.base_price !== null && d.base_price !== undefined ? Number(d.base_price) : null,
      }));

      setDurations(normalized);

      if (!selectedDurationId && normalized.length > 0) {
        const def = normalized.find((x) => x.is_default) || normalized[0];
        if (def) setSelectedDurationId(String(def.id));
      }
    } catch (e) {
      setErrorText(e?.message || t('service.playgrounds.booking.errors.loadDurations'));
    }
  }, [getVenueDurations, selectedDurationId, t, venue]);

  const loadSlots = useCallback(
    async (dateValue, durationIdValue) => {
      if (!venue?.id || !dateValue || !durationIdValue) return;

      setSlotsLoading(true);
      setSlots([]);
      setSelectedSlot(null);
      setInlinePaymentError('');

      try {
        const durationObj = durations.find((d) => String(d.id) === String(durationIdValue));
        const minutes = Number(durationObj?.minutes ?? durationObj?.duration_minutes);
        if (!minutes) {
          setErrorText(t('service.playgrounds.booking.errors.invalidDuration'));
          return;
        }

        const res = await listAvailableSlots({
          venueId: venue.id,
          date: dateValue,
          duration_minutes: minutes,
          number_of_players: players,
          activity_id: venue.activity_id,
          academy_profile_id: venue.academy_profile_id,
        });

        const list = Array.isArray(res?.data) ? res.data : res?.slots || [];
        setSlots(list);
      } catch (e) {
        setErrorText(e?.message || t('service.playgrounds.booking.errors.loadSlots'));
      } finally {
        setSlotsLoading(false);
      }
    },
    [durations, listAvailableSlots, players, t, venue],
  );

  // -------- wizard navigation
  const nextStep = useCallback(() => {
    setInlinePaymentError('');
    if (step === 0 && !scheduleReady) return;
    if (step === 1 && !playersValid) return;
    if (step === 2 && paymentType === 'cliq' && !cliqImage) {
      setInlinePaymentError(t('service.playgrounds.booking.payment.uploadRequired'));
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }, [cliqImage, paymentType, playersValid, scheduleReady, step, t]);

  const prevStep = useCallback(() => {
    if (step === 0) {
      goBack();
      return;
    }
    setInlinePaymentError('');
    setStep((s) => Math.max(0, s - 1));
  }, [goBack, step]);

  // -------- step handlers
  const onSelectDuration = useCallback((id) => {
    setSelectedDurationId(String(id));
    setSelectedSlot(null);
    setSlots([]);
  }, []);

  const onSelectDate = useCallback((dateValue) => {
    setBookingDate(String(dateValue));
    setSelectedSlot(null);
    setSlots([]);
  }, []);

  const onSelectSlot = useCallback((slot) => setSelectedSlot(slot), []);

  const onPlayersPreset = useCallback((value) => {
    const v = Number(value);
    if (Number.isNaN(v)) return;
    setPlayers(Math.min(maxPlayers, Math.max(minPlayers, v)));
  }, [maxPlayers, minPlayers]);

  const onPlayersInc = useCallback(() => setPlayers((p) => Math.min(maxPlayers, p + 1)), [maxPlayers]);
  const onPlayersDec = useCallback(() => setPlayers((p) => Math.max(minPlayers, p - 1)), [minPlayers]);

  const onPaymentType = useCallback((type) => {
    setPaymentType(type);
    setInlinePaymentError('');
  }, []);

  const onCashOnDate = useCallback((val) => setCashOnDate(val), []);

  const onPickCliqImage = useCallback(async (pickerFn) => {
    // pickerFn is provided by steps file to avoid importing expo-image-picker in screen
    const picked = await pickerFn();
    if (picked) {
      setCliqImage(picked);
      setInlinePaymentError('');
    }
  }, []);

  // -------- submit
  const submitBooking = useCallback(async () => {
    if (submitting || !allValid || !selectedDuration || !selectedSlot || !durationMinutes) {
      setErrorText(t('service.playgrounds.booking.errors.completeSteps'));
      return;
    }

    if (!publicUser?.id) {
      if (draftPayload) await persistBookingDraft(draftPayload);
      const redirectTo = `/playgrounds/book/${venue?.id || venueId}`;
      router.push(`/(auth)/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    if (paymentType === 'cliq' && !cliqImage) {
      setStep(2);
      setInlinePaymentError(t('service.playgrounds.booking.payment.uploadRequired'));
      return;
    }

    setSubmitting(true);
    setErrorText('');

    try {
      const nextKey =
        idempotencyKey || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      if (!idempotencyKey) setIdempotencyKey(nextKey);

      const availability = await verifySlotAvailability({
        venueId: venue.id,
        date: bookingDate,
        duration_minutes: durationMinutes,
        startTime: selectedSlot.start_time || selectedSlot.start,
        number_of_players: players,
        activity_id: venue.activity_id,
        academy_profile_id: venue.academy_profile_id,
      });

      if (!availability?.success || !availability?.data?.available) {
        setSelectedSlot(null);
        setStep(0);
        setErrorText(t('service.playgrounds.booking.errors.slotUnavailable'));
        return;
      }

      const fd = new FormData();
      fd.append('academy_profile_id', String(venue.academy_profile_id));
      fd.append('user_id', String(publicUser.id));
      fd.append('activity_id', String(venue.activity_id));
      fd.append('venue_id', String(venue.id));
      fd.append('duration_id', String(selectedDuration.id));
      fd.append('booking_date', String(bookingDate));
      fd.append('start_time', String(selectedSlot.start_time));
      fd.append('number_of_players', String(players));
      fd.append('payment_type', String(paymentType));
      fd.append('cash_payment_on_date', paymentType === 'cash' && cashOnDate ? 'true' : 'false');

      if (paymentType === 'cliq' && cliqImage?.uri) {
        fd.append('cliq_image', {
          uri: cliqImage.uri,
          name: cliqImage.fileName || 'cliq.jpg',
          type: cliqImage.mimeType || 'image/jpeg',
        });
      }

      const res = await createBooking(fd, { headers: { 'Idempotency-Key': nextKey } });
      if (res?.success === false) throw res.error || new Error('Booking failed');

      await clearBookingDraft();
      await listBookings({ user_id: publicUser.id });

      setIdempotencyKey(null);
      setBookingResult(res?.data || res || null);
      setBookingSuccess(true);

      toast.success(t('service.playgrounds.booking.success.toastMessage'), {
        title: t('service.playgrounds.booking.success.toastTitle'),
        duration: 5000,
      });
    } catch (e) {
      const status = e?.status || e?.response?.status || e?.meta?.status;
      if (status === 409) {
        setSelectedSlot(null);
        setStep(0);
        setErrorText(t('service.playgrounds.booking.errors.slotUnavailable'));
        return;
      }
      setErrorText(e?.message || t('service.playgrounds.booking.errors.submit'));
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
    durationMinutes,
    idempotencyKey,
    listBookings,
    paymentType,
    persistBookingDraft,
    players,
    publicUser?.id,
    router,
    selectedDuration,
    selectedSlot,
    submitting,
    t,
    toast,
    venue,
    venueId,
    verifySlotAvailability,
    clearBookingDraft,
  ]);

  const goToMyBookings = useCallback(() => {
  // replace so user doesn’t come back to a stale wizard
  router.replace('/playgrounds/bookings');
}, [router]);


  // -------- render
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
          actionLabel={t('service.playgrounds.booking.errors.retry')}
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
          actionLabel={t('service.playgrounds.booking.empty.action')}
          onAction={goBack}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen safe edges={['top']} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <BookingWizardSteps
            // ui
            styles={styles}
            colors={colors}
            t={t}
            // wizard
            step={step}
            setStep={setStep}
            priceLabel={priceLabel}
            submitting={submitting}
            bookingSuccess={bookingSuccess}
            bookingResult={bookingResult}
            errorText={errorText}
            onGoToBookings={goToMyBookings}
            // venue
            venue={venue}
            academy={academy}
            // schedule state
            durations={durations}
            durationsLoading={durationsLoading}
            selectedDurationId={selectedDurationId}
            onSelectDuration={onSelectDuration}
            quickDates={quickDates}
            bookingDate={bookingDate}
            onSelectDate={onSelectDate}
            slots={slots}
            slotsLoading={slotsLoading}
            selectedSlot={selectedSlot}
            onSelectSlot={onSelectSlot}
            // players
            players={players}
            minPlayers={minPlayers}
            maxPlayers={maxPlayers}
            onPlayersPreset={onPlayersPreset}
            onPlayersInc={onPlayersInc}
            onPlayersDec={onPlayersDec}
            // payment
            allowCash={allowCash}
            allowCashOnDate={allowCashOnDate}
            allowCliq={allowCliq}
            cliqName={cliqName}
            cliqNumber={cliqNumber}
            paymentType={paymentType}
            onPaymentType={onPaymentType}
            cashOnDate={cashOnDate}
            onCashOnDate={onCashOnDate}
            cliqImage={cliqImage}
            onPickCliqImage={onPickCliqImage}
            inlinePaymentError={inlinePaymentError}
            // navigation/submit
            onBack={prevStep}
            onNext={nextStep}
            onConfirm={submitBooking}
            // validations
            scheduleReady={scheduleReady}
            playersValid={playersValid}
            paymentReady={paymentReady}
            allValid={allValid}
            // helpers
            formatSlotLabel={formatSlotLabel}
          />

          <View style={styles.footerSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
export default BookingWizardScreen;
