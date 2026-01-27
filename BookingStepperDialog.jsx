// src/components/playgrounds/BookingStepperDialog.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Users,
  Calendar,
  Clock,
  X,
  Shield,
  CreditCard,
  Wallet,
  Banknote,
  UploadCloud,
  Check,
  Trophy,
  Sun,
  Moon,
  ChevronRight,
  AlertCircle,
  Loader2,
  Sparkles,
  CalendarDays,
  Phone,
  User,
  CreditCard as CardIcon,
  Smartphone,
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/Radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

const env = import.meta.env || {};
const BASE_URL = env.VITE_API_BASE_URL || '';
const PLAYGROUNDS_CLIENT_KEY = 'sporhive_public_user';

// Compact Stepper with smooth animations
const Stepper = ({ steps, currentStep }) => {
  const total = steps.length - 1;
  const progress = total > 0 ? (currentStep / total) * 100 : 0;

  return (
    <div className="border-b border-slate-100 bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80">
      <div className="px-4 pt-4 pb-3">
        <div className="relative flex items-center justify-between">
          {steps.map((step, index) => {
            const isDone = index < currentStep;
            const isActive = index === currentStep;
            const isUpcoming = index > currentStep;

            return (
              <div
                key={step.id}
                className="relative flex-1 first:flex-[0.9] last:flex-[0.9] flex flex-col items-center"
              >
                {/* Connecting line */}
                {index > 0 && (
                  <div className="absolute left-0 right-0 top-4 flex items-center">
                    <div className="h-0.5 w-full bg-slate-200 overflow-hidden">
                      <motion.div
                        className="h-full bg-orange-500 origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: index <= currentStep ? 1 : 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      />
                    </div>
                  </div>
                )}

                {/* Step circle */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        className="relative z-10 flex items-center justify-center"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300',
                            isDone && 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/30',
                            isActive && 'border-orange-500 bg-white text-orange-500 shadow-lg shadow-orange-500/20 ring-4 ring-orange-100',
                            isUpcoming && 'border-slate-200 bg-white text-slate-400',
                          )}
                        >
                          {isDone ? (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', stiffness: 200 }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </motion.div>
                          ) : (
                            <div className="transition-transform group-hover:scale-110">
                              {step.icon}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {step.label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Step label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      'text-[11px] font-medium leading-tight transition-colors',
                      (isDone || isActive) && 'text-slate-900',
                      isUpcoming && 'text-slate-500',
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <Progress
            value={progress}
            className="h-1.5 rounded-full bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-amber-500"
          />
        </div>
      </div>
    </div>
  );
};

// Step transition wrapper
const StepTransition = ({ children, key }) => (
  <motion.div
    key={key}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    className="h-full"
  >
    {children}
  </motion.div>
);

export default function BookingStepperDialog({
  open,
  onClose,
  venue,
  client,
  baseFilters,
  onBookingCreated,
  onRequireAuth,
  draft,
  userMode = 'guest',
}) {
  const { t } = useTranslation();

  // Core state
  const [activityName, setActivityName] = useState('');
  const [durations, setDurations] = useState([]);
  const [durationsLoading, setDurationsLoading] = useState(false);
  const [selectedDurationId, setSelectedDurationId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [players, setPlayers] = useState(2);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [paymentType, setPaymentType] = useState('cash');
  const [cashOnDate, setCashOnDate] = useState(false);
  const [cliqImage, setCliqImage] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  // Guest quick registration
  const [guestUser, setGuestUser] = useState(null);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [guestError, setGuestError] = useState('');
  const [guestForm, setGuestForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  // Academy data
  const academy = useMemo(
    () => (venue && venue.academy_profile ? venue.academy_profile : null),
    [venue]
  );

  const allowCash = academy && typeof academy.allow_cash === 'boolean' ? academy.allow_cash : true;
  const allowCliq = !!(academy && academy.allow_cliq);
  const allowCashOnDate = !!(academy && academy.allow_cash_on_date);

  const cliqName = academy?.cliq_name || '';
  const cliqNumber = academy?.cliq_number || '';

  // Steps
  const steps = [
    {
      id: 'schedule',
      label: t('playgrounds.booking.steps.schedule', 'Time'),
      icon: <Calendar className="h-3.5 w-3.5" />,
    },
    {
      id: 'players',
      label: t('playgrounds.booking.steps.players', 'Players'),
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      id: 'payment',
      label: t('playgrounds.booking.steps.payment', 'Payment'),
      icon: <CreditCard className="h-3.5 w-3.5" />,
    },
    {
      id: 'confirm',
      label: t('playgrounds.booking.steps.confirm', 'Review'),
      icon: <Check className="h-3.5 w-3.5" />,
    },
  ];

  // Restore draft when dialog opens
  useEffect(() => {
    if (!open || !draft) return;

    if (draft.selectedDurationId) setSelectedDurationId(draft.selectedDurationId);
    if (draft.bookingDate) setBookingDate(draft.bookingDate);
    if (draft.players) setPlayers(draft.players);
    if (draft.selectedSlot) setSelectedSlot(draft.selectedSlot);
    if (draft.paymentType) setPaymentType(draft.paymentType);
    if (typeof draft.cashOnDate === 'boolean') setCashOnDate(draft.cashOnDate);
    if (typeof draft.currentStep === 'number') setCurrentStep(draft.currentStep);
  }, [open, draft]);

  // Pre-fill with base filters if no draft
  useEffect(() => {
    if (!open || !baseFilters || draft) return;

    if (!bookingDate && baseFilters.date) {
      setBookingDate(baseFilters.date);
    }
    if (!players && baseFilters.numberOfPlayers) {
      setPlayers(baseFilters.numberOfPlayers);
    }
  }, [open, baseFilters, draft, bookingDate, players]);

  // Keep payment type valid according to academy options
  useEffect(() => {
    if (!allowCliq && paymentType === 'cliq') {
      setPaymentType(allowCash ? 'cash' : 'cash');
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
  }, [allowCash, allowCliq, allowCashOnDate, paymentType, cashOnDate]);

  // Load activity name
  useEffect(() => {
    if (!open || !venue) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${BASE_URL}/playgrounds/admin/activities/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: academy?.academy_id,
            include_inactive: false,
          }),
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.activities) || cancelled) return;
        const act = data.activities.find((a) => a.id === venue.activity_id);
        if (act && !cancelled) setActivityName(act.name || '');
      } catch (err) {
        console.error('Error loading activities', err);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, academy, venue]);

  // Load durations
  useEffect(() => {
    if (!open || !venue) return;
    let cancelled = false;

    const loadDurations = async () => {
      setDurationsLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/playgrounds/admin/venues/durations/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ venue_id: venue.id }),
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.durations) || cancelled) return;

        const normalized = data.durations.map((d) => ({
          ...d,
          base_price:
            d.base_price !== null && d.base_price !== undefined ? Number(d.base_price) : null,
        }));

        setDurations(normalized);

        if (!selectedDurationId) {
          const def = normalized.find((d) => d.is_default) || normalized[0];
          if (def) setSelectedDurationId(def.id);
        }
      } catch (err) {
        console.error('Error loading durations', err);
      } finally {
        if (!cancelled) setDurationsLoading(false);
      }
    };

    loadDurations();
    return () => {
      cancelled = true;
    };
  }, [open, venue, selectedDurationId]);

  // Load available slots for selected date + duration
  useEffect(() => {
    if (!open || !venue || !bookingDate || !selectedDurationId) return;
    const durationObj = durations.find((d) => d.id === selectedDurationId);
    if (!durationObj) return;

    let cancelled = false;

    const loadSlots = async () => {
      setSlotsLoading(true);
      setSlots([]);
      setSelectedSlot(null);
      try {
        const res = await fetch(`${BASE_URL}/playgrounds/public/slots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            venue_id: venue.id,
            date: bookingDate,
            duration_minutes: durationObj.minutes,
          }),
        });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        setSlots(Array.isArray(data.slots) ? data.slots : []);
      } catch (err) {
        console.error('Error loading slots', err);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    };

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [open, venue, bookingDate, selectedDurationId, durations]);

  if (!open || !venue) return null;

  const selectedDuration = durations.find((d) => d.id === selectedDurationId);
  const basePrice =
    selectedDuration && selectedDuration.base_price != null
      ? Number(selectedDuration.base_price)
      : null;

  const requiresCliqImage = paymentType === 'cliq';

  // Client resolution
  const persistPublicUser = (user) => {
    try {
      window.localStorage.setItem('sporhive_public_user', JSON.stringify(user));
      window.localStorage.setItem('sporhive_public_user_mode', 'registered');
      window.localStorage.setItem(PLAYGROUNDS_CLIENT_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Error persisting public user', e);
    }
  };

  const getStoredPlaygroundsClient = () => {
    try {
      const raw = window.localStorage.getItem(PLAYGROUNDS_CLIENT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
      return null;
    } catch (err) {
      console.error('Error reading stored playgrounds client', err);
      return null;
    }
  };

  const effectiveClient = client && client.id ? client : guestUser || getStoredPlaygroundsClient();

  const needsAuthentication = !effectiveClient?.id && userMode !== 'guest';

  const canSubmit =
    !!selectedDuration &&
    !!bookingDate &&
    !!selectedSlot &&
    !!players &&
    players >= (venue.min_players || 1) &&
    players <= (venue.max_players || 100) &&
    !!paymentType &&
    (!requiresCliqImage || !!cliqImage) &&
    !submitting &&
    !needsAuthentication;

  const buildBookingDraft = () => ({
    selectedDurationId,
    bookingDate,
    players,
    selectedSlot,
    paymentType,
    cashOnDate,
    currentStep,
  });

  const submitBooking = async (bookingClient) => {
    if (!bookingClient?.id) {
      console.error('submitBooking called without a valid user');
      return;
    }

    if (!selectedDuration || !selectedSlot) return;

    if (paymentType === 'cliq' && !cliqImage) {
      setErrorText(
        t(
          'playgrounds.booking.errors.cliqScreenshotRequired',
          'Please upload your CliQ transfer screenshot before confirming.'
        )
      );
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);
    setErrorText('');

    try {
      const formData = new FormData();
      formData.append('academy_profile_id', venue.academy_profile_id);
      formData.append('user_id', bookingClient.id);
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

      if (paymentType === 'cliq' && cliqImage) {
        formData.append('cliq_image', cliqImage);
      }

      const res = await fetch(`${BASE_URL}/playgrounds/public/bookings/create`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorText(
          data.error ||
            t(
              'playgrounds.booking.errors.submitFailed',
              'Unable to submit booking. Please try again.'
            )
        );
        return;
      }

      if (onBookingCreated) onBookingCreated(data);
      onClose();
    } catch (err) {
      console.error('Error submitting booking', err);
      setErrorText(
        t(
          'playgrounds.booking.errors.submitFailedDetails',
          'Unable to submit booking. Please check your details and try again.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestQuickRegister = async () => {
    setGuestError('');

    const first = guestForm.first_name.trim();
    const last = guestForm.last_name.trim();
    const phone = guestForm.phone.trim();

    if (!first || !last || !phone) {
      setGuestError(
        t(
          'playgrounds.booking.guest.validation.required',
          'Please enter your first name, last name and phone number.'
        )
      );
      return;
    }

    if (!/^[0-9+]{8,20}$/.test(phone)) {
      setGuestError(
        t('playgrounds.booking.guest.validation.phoneInvalid', 'Please enter a valid phone number.')
      );
      return;
    }

    setGuestSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}//public-users/quick-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          phone,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const errMsg =
          data.error ||
          t(
            'playgrounds.booking.guest.errors.quickRegisterFailed',
            'Unable to create your account. Please login or try again.'
          );

        if (/already registered/i.test(errMsg) && typeof onRequireAuth === 'function') {
          const bookingDraft = buildBookingDraft();
          onRequireAuth(bookingDraft);
          setGuestDialogOpen(false);
          return;
        }

        setGuestError(errMsg);
        return;
      }

      const user = data.user || data;
      setGuestUser(user);
      persistPublicUser(user);
      setGuestDialogOpen(false);

      await submitBooking(user);
    } catch (err) {
      console.error('Error in guest quick-register', err);
      setGuestError(
        t('playgrounds.booking.guest.errors.network', 'Network error. Please try again.')
      );
    } finally {
      setGuestSubmitting(false);
    }
  };

  const handleSubmitBooking = async () => {
    if (needsAuthentication) {
      const bookingDraft = buildBookingDraft();
      if (onRequireAuth) onRequireAuth(bookingDraft);
      return;
    }

    if (!selectedDuration || !selectedSlot) return;

    if (paymentType === 'cliq' && !cliqImage) {
      setErrorText(
        t(
          'playgrounds.booking.errors.cliqScreenshotRequired',
          'Please upload your CliQ transfer screenshot before confirming.'
        )
      );
      setCurrentStep(2);
      return;
    }

    if (!effectiveClient?.id && userMode === 'guest') {
      setGuestDialogOpen(true);
      return;
    }

    if (!canSubmit) return;

    if (!effectiveClient?.id) {
      const bookingDraft = buildBookingDraft();
      if (onRequireAuth) {
        onRequireAuth(bookingDraft);
      } else {
        setErrorText(
          t(
            'playgrounds.booking.errors.authRequired',
            'Please login or continue as guest before confirming your booking.'
          )
        );
      }
      return;
    }

    await submitBooking(effectiveClient);
  };

  // Helpers
  const getDayLabel = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'long' });
  };

  const getSlotPhase = (timeStr) => {
    if (!timeStr) return 'day';
    const [h] = timeStr.split(':');
    const hour = parseInt(h, 10);
    return hour >= 6 && hour < 18 ? 'day' : 'night';
  };

  const cliqInputId = 'cliq-upload-input';

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const locationLabel =
    academy?.location_text ||
    venue.base_location ||
    t('playgrounds.booking.labels.location', 'Location');

  const headerDateTimeSummary =
    bookingDate && selectedSlot
      ? `${bookingDate} • ${selectedSlot.start_time}`
      : bookingDate
        ? `${bookingDate}`
        : '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="
          max-w-5xl w-full p-0 overflow-hidden rounded-2xl border-0
          bg-white shadow-2xl shadow-slate-900/10
          max-h-[95vh] md:max-h-[90vh] flex flex-col
          animate-in fade-in-0 zoom-in-95 duration-200
        "
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-4 md:px-6">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-purple-500/10" />
          <DialogHeader className="relative p-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm">
                    {academy?.hero_image ? (
                      <img
                        src={academy.hero_image}
                        alt={academy.public_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Trophy className="h-6 w-6 text-white/80" />
                    )}
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md">
                    <Sparkles className="h-2.5 w-2.5 text-orange-500" />
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <DialogTitle className="truncate text-lg font-semibold text-white md:text-xl">
                    {t('playgrounds.booking.header.title', 'Book')} {venue.name}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/90">
                    {academy?.public_name && (
                      <>
                        <span className="truncate max-w-[120px] md:max-w-[180px] font-medium">
                          {academy.public_name}
                        </span>
                        <span className="opacity-60">•</span>
                      </>
                    )}

                    <span className="flex items-center gap-1.5 truncate max-w-[140px] md:max-w-[200px]">
                      <MapPin className="h-3.5 w-3.5" />
                      {locationLabel}
                    </span>

                    {activityName && (
                      <>
                        <span className="opacity-60">•</span>
                        <span className="truncate max-w-[120px] md:max-w-[160px]">
                          {activityName}
                        </span>
                      </>
                    )}
                  </div>

                  {headerDateTimeSummary && (
                    <div className="mt-1.5 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1.5 text-xs text-white">
                      <Calendar className="h-3.5 w-3.5" />
                      {headerDateTimeSummary}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Stepper */}
        <Stepper steps={steps} currentStep={currentStep} />

        {/* Body */}
        <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] overflow-hidden">
          {/* Steps column */}
          <div className="min-h-[400px] flex-1 overflow-y-auto px-4 pb-5 pt-5 md:px-6 md:pb-6 md:pt-6">
            <AnimatePresence mode="wait">
              {/* STEP 0: Schedule */}
              {currentStep === 0 && (
                <StepTransition key="schedule">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-900 md:text-xl">
                        {t('playgrounds.booking.schedule.title', 'Choose date, time & duration')}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {t(
                          'playgrounds.booking.schedule.subtitle',
                          'Pick a duration, then choose a day and an available time slot.'
                        )}
                      </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.15fr_minmax(0,1fr)]">
                      {/* Duration selector */}
                      <div className="space-y-4">
                        <Label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Clock className="h-4 w-4 text-orange-500" />
                          {t('playgrounds.booking.schedule.durationLabel', 'Duration')}
                        </Label>

                        {durationsLoading ? (
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Skeleton key={i} className="h-24 rounded-xl" />
                            ))}
                          </div>
                        ) : durations.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
                            <AlertCircle className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                            <p className="text-sm text-slate-600">
                              {t(
                                'playgrounds.booking.schedule.noDurations',
                                'No durations available for this venue.'
                              )}
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {durations.map((duration) => {
                              const isSelected = selectedDurationId === duration.id;
                              return (
                                <motion.button
                                  key={duration.id}
                                  type="button"
                                  onClick={() => setSelectedDurationId(duration.id)}
                                  whileHover={{ y: -2 }}
                                  whileTap={{ scale: 0.98 }}
                                  className={cn(
                                    'group flex flex-col justify-between rounded-xl border px-4 py-4 text-left transition-all',
                                    isSelected
                                      ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-white shadow-lg shadow-orange-500/10'
                                      : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50',
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="text-sm font-semibold text-slate-900">
                                        {duration.minutes}{' '}
                                        {t('playgrounds.booking.labels.minutesShort', 'min')}
                                      </div>
                                      {duration.is_default && (
                                        <Badge className="mt-2 bg-gradient-to-r from-orange-500 to-amber-500 text-xs text-white">
                                          {t('playgrounds.booking.labels.mostPopular', 'Most popular')}
                                        </Badge>
                                      )}
                                    </div>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </motion.div>
                                    )}
                                  </div>

                                  {duration.base_price != null && (
                                    <div className="mt-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-2.5">
                                      <div className="text-xs text-slate-600">
                                        {t('playgrounds.booking.labels.from', 'From')}
                                      </div>
                                      <div className="text-base font-bold text-orange-600">
                                        {duration.base_price}{' '}
                                        {t('playgrounds.booking.labels.currency', 'JOD')}
                                      </div>
                                    </div>
                                  )}

                                  {duration.note && (
                                    <p className="mt-2 text-xs text-slate-600">{duration.note}</p>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Date + Time */}
                      <div className="space-y-6">
                        {/* Date */}
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <CalendarDays className="h-4 w-4 text-orange-500" />
                            {t('playgrounds.booking.schedule.dateLabel', 'Date')}
                          </Label>

                          {!selectedDurationId && (
                            <p className="text-sm text-orange-600">
                              {t(
                                'playgrounds.booking.schedule.selectDurationFirst',
                                'Select a duration first to see available dates and time slots.'
                              )}
                            </p>
                          )}

                          <div className="space-y-2">
                            <Input
                              type="date"
                              disabled={!selectedDurationId}
                              className={cn(
                                'h-11 rounded-xl border text-sm font-medium',
                                selectedDurationId
                                  ? 'border-slate-200 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                                  : 'border-slate-200/70 bg-slate-50 text-slate-400',
                              )}
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                            />
                            {bookingDate && (
                              <div className="text-sm font-semibold text-orange-600">
                                {getDayLabel(bookingDate)}
                              </div>
                            )}
                          </div>

                          {/* Quick dates */}
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-700">
                              {t('playgrounds.booking.schedule.quickSelect', 'Quick select')}
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {[0, 1, 2, 3, 4, 5].map((offset) => {
                                const date = new Date();
                                date.setDate(date.getDate() + offset);
                                const iso = date.toISOString().slice(0, 10);
                                const isActive = bookingDate === iso;

                                const label =
                                  offset === 0
                                    ? t('playgrounds.booking.schedule.today', 'Today')
                                    : offset === 1
                                      ? t('playgrounds.booking.schedule.tomorrow', 'Tomorrow')
                                      : `${date.toLocaleDateString('en-US', {
                                          weekday: 'short',
                                        })} ${date.getDate()}`;

                                return (
                                  <motion.button
                                    key={offset}
                                    type="button"
                                    disabled={!selectedDurationId}
                                    onClick={() => setBookingDate(iso)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                      'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                                      !selectedDurationId
                                        ? 'bg-slate-100 text-slate-400'
                                        : isActive
                                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                                    )}
                                  >
                                    {label}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Time slots */}
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <Clock className="h-4 w-4 text-orange-500" />
                            {t('playgrounds.booking.schedule.timeSlotsLabel', 'Available time slots')}
                          </Label>

                          {!selectedDurationId ? (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-600">
                              {t(
                                'playgrounds.booking.schedule.pickDurationFirst',
                                'Pick a duration to view time slots.'
                              )}
                            </div>
                          ) : slotsLoading ? (
                            <div className="space-y-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-11 rounded-xl" />
                              ))}
                            </div>
                          ) : !bookingDate ? (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-600">
                              {t(
                                'playgrounds.booking.schedule.selectDateFirst',
                                'Select a date to see available time slots.'
                              )}
                            </div>
                          ) : slots.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center">
                              <Clock className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                              <p className="text-sm text-slate-600">
                                {t(
                                  'playgrounds.booking.schedule.noSlots',
                                  'No available slots for this duration on the selected date.'
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {slots.map((slot, idx) => {
                                const isSelected = selectedSlot?.start_time === slot.start_time;
                                const phase = getSlotPhase(slot.start_time);

                                return (
                                  <motion.button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedSlot(slot)}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                      'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all',
                                      isSelected
                                        ? 'border-orange-500 bg-gradient-to-r from-orange-50 to-white shadow-md'
                                        : 'border-slate-200 bg-white hover:border-orange-300',
                                    )}
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-900">
                                        {slot.start_time}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {t('playgrounds.booking.labels.until', 'until')} {slot.end_time}
                                      </div>
                                    </div>
                                    <div
                                      className={cn(
                                        'flex h-8 w-8 items-center justify-center rounded-lg',
                                        phase === 'day'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-slate-800 text-white',
                                      )}
                                    >
                                      {phase === 'day' ? (
                                        <Sun className="h-4 w-4" />
                                      ) : (
                                        <Moon className="h-4 w-4" />
                                      )}
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </StepTransition>
              )}

              {/* STEP 1: Players */}
              {currentStep === 1 && (
                <StepTransition key="players">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-900 md:text-xl">
                        {t('playgrounds.booking.players.title', 'Number of players')}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {t(
                          'playgrounds.booking.players.subtitle',
                          'Tell us how many players will join.'
                        )}
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-50 px-5 py-8">
                        <div className="flex flex-col items-center gap-6">
                          <div className="text-center space-y-1">
                            <div className="text-4xl font-bold text-orange-600 md:text-5xl">
                              {players}
                            </div>
                            <div className="text-sm text-slate-600">
                              {t('playgrounds.booking.labels.players', 'Players')}
                            </div>
                          </div>

                          <div className="w-full max-w-sm space-y-6">
                            <div className="flex items-center justify-between">
                              <motion.button
                                type="button"
                                onClick={() =>
                                  setPlayers((p) => Math.max(p - 1, venue.min_players || 1))
                                }
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-200 text-2xl font-bold text-slate-600 transition-colors hover:border-orange-500 hover:text-orange-600"
                              >
                                −
                              </motion.button>

                              <div className="text-center">
                                <div className="text-sm font-medium text-slate-700">
                                  {t('playgrounds.booking.players.rangeLabel', 'Allowed range')}
                                </div>
                                <div className="text-sm text-slate-600">
                                  {venue.min_players || 1} – {venue.max_players || 10}
                                </div>
                              </div>

                              <motion.button
                                type="button"
                                onClick={() =>
                                  setPlayers((p) => Math.min(p + 1, venue.max_players || 10))
                                }
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-200 text-2xl font-bold text-slate-600 transition-colors hover:border-orange-500 hover:text-orange-600"
                              >
                                +
                              </motion.button>
                            </div>

                            <Input
                              type="range"
                              min={venue.min_players || 1}
                              max={venue.max_players || 10}
                              value={players}
                              onChange={(e) => setPlayers(Number(e.target.value))}
                              className="
                                h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200
                                [&::-webkit-slider-thumb]:h-5
                                [&::-webkit-slider-thumb]:w-5
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-gradient-to-r
                                [&::-webkit-slider-thumb]:from-orange-500
                                [&::-webkit-slider-thumb]:to-amber-500
                                [&::-webkit-slider-thumb]:shadow-lg
                              "
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quick suggestions */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[2, 4, 6, 8].map((num) => (
                          <motion.button
                            key={num}
                            type="button"
                            onClick={() => setPlayers(num)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              'flex items-center justify-between rounded-xl border px-4 py-4 text-left transition-all',
                              players === num
                                ? 'border-orange-500 bg-gradient-to-r from-orange-50 to-white'
                                : 'border-slate-200 bg-white hover:border-slate-300',
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                                <Users className="h-5 w-5 text-slate-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {num} {t('playgrounds.booking.labels.players', 'Players')}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {t(
                                    'playgrounds.booking.players.standardGroup',
                                    'Standard group size'
                                  )}
                                </div>
                              </div>
                            </div>
                            {players === num && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </motion.div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </StepTransition>
              )}

              {/* STEP 2: Payment */}
              {currentStep === 2 && (
                <StepTransition key="payment">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-900 md:text-xl">
                        {t('playgrounds.booking.payment.title', 'Payment method')}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {t('playgrounds.booking.payment.subtitle', "Choose how you'd like to pay.")}
                      </p>
                    </div>

                    <RadioGroup
                      value={paymentType}
                      onValueChange={(val) => {
                        setPaymentType(val);
                        if (val !== 'cliq') setCliqImage(null);
                        setErrorText('');
                      }}
                      className="space-y-4"
                    >
                      {/* Cash */}
                      {allowCash && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'rounded-xl border px-5 py-4 transition-all',
                            paymentType === 'cash'
                              ? 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-white shadow-lg shadow-emerald-500/10'
                              : 'border-slate-200 bg-white hover:border-slate-300',
                          )}
                        >
                          <label className="flex cursor-pointer items-start gap-4">
                            <div
                              className={cn(
                                'flex h-12 w-12 items-center justify-center rounded-xl',
                                paymentType === 'cash'
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600',
                              )}
                            >
                              <Banknote className="h-6 w-6" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value="cash" id="cash" />
                                <span className="text-base font-semibold text-slate-900">
                                  {t('playgrounds.booking.payment.cashTitle', 'Pay with cash')}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="ml-1 border-emerald-300 bg-emerald-50 text-xs text-emerald-700"
                                >
                                  {t('playgrounds.booking.payment.onSite', 'On site')}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600">
                                {t(
                                  'playgrounds.booking.payment.cashDescription',
                                  'Pay at the academy before your game.'
                                )}
                              </p>
                            </div>
                          </label>

                          {paymentType === 'cash' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-4 overflow-hidden"
                            >
                              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                {allowCashOnDate ? (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-slate-700">
                                        {t(
                                          'playgrounds.booking.payment.cashOnDate',
                                          'Pay on booking date'
                                        )}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setCashOnDate(!cashOnDate)}
                                        className={cn(
                                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                                          cashOnDate ? 'bg-emerald-500' : 'bg-slate-300',
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                                            cashOnDate ? 'translate-x-6' : 'translate-x-1',
                                          )}
                                        />
                                      </button>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {t(
                                        'playgrounds.booking.payment.cashOnDateHint',
                                        'You can still pay earlier at the academy if needed.'
                                      )}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-sm text-slate-500">
                                    {t(
                                      'playgrounds.booking.payment.cashOnlyHint',
                                      'Please pay your total at the academy reception before the game.'
                                    )}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}

                      {/* CliQ */}
                      {allowCliq && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className={cn(
                            'rounded-xl border px-5 py-4 transition-all',
                            paymentType === 'cliq'
                              ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-white shadow-lg shadow-blue-500/10'
                              : 'border-slate-200 bg-white hover:border-slate-300',
                          )}
                        >
                          <label className="flex cursor-pointer items-start gap-4">
                            <div
                              className={cn(
                                'flex h-12 w-12 items-center justify-center rounded-xl',
                                paymentType === 'cliq'
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-600',
                              )}
                            >
                              <Wallet className="h-6 w-6" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value="cliq" id="cliq" />
                                <span className="text-base font-semibold text-slate-900">
                                  {t('playgrounds.booking.payment.cliqTitle', 'CliQ transfer')}
                                </span>
                                <Badge className="ml-1 border-0 bg-blue-100 text-xs text-blue-700">
                                  {t('playgrounds.booking.payment.online', 'Online')}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600">
                                {t(
                                  'playgrounds.booking.payment.cliqDescription',
                                  "Transfer to the academy's CliQ account."
                                )}
                              </p>

                              {(cliqName || cliqNumber) && (
                                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                  {cliqName && (
                                    <div className="flex justify-between gap-4">
                                      <span className="opacity-80">
                                        {t('playgrounds.booking.payment.cliqName', 'CliQ name')}
                                      </span>
                                      <span className="font-semibold">{cliqName}</span>
                                    </div>
                                  )}
                                  {cliqNumber && (
                                    <div className="mt-2 flex justify-between gap-4">
                                      <span className="opacity-80">
                                        {t('playgrounds.booking.payment.cliqNumber', 'CliQ number')}
                                      </span>
                                      <span className="font-semibold">{cliqNumber}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </label>

                          {paymentType === 'cliq' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-4 overflow-hidden"
                            >
                              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-3">
                                <label
                                  htmlFor={cliqInputId}
                                  className="flex cursor-pointer items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-3">
                                    <UploadCloud className="h-5 w-5 text-blue-500" />
                                    <span className="text-sm font-medium text-slate-700">
                                      {t(
                                        'playgrounds.booking.payment.uploadTransferLabel',
                                        'Upload transfer screenshot (required)'
                                      )}
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(cliqInputId)?.click()}
                                    className="rounded-lg text-sm"
                                  >
                                    {t('common.upload', 'Upload')}
                                  </Button>
                                </label>

                                <input
                                  id={cliqInputId}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => setCliqImage(e.target.files?.[0] || null)}
                                />

                                {cliqImage ? (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                                  >
                                    <Check className="h-4 w-4 text-emerald-500" />
                                    <span className="truncate">{cliqImage.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => setCliqImage(null)}
                                      className="ml-auto text-xs text-slate-500 hover:text-slate-700"
                                    >
                                      {t('common.remove', 'Remove')}
                                    </button>
                                  </motion.div>
                                ) : (
                                  <p className="text-sm text-red-600">
                                    {t(
                                      'playgrounds.booking.payment.cliqScreenshotHint',
                                      'CliQ payments require a transfer screenshot.'
                                    )}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </RadioGroup>
                  </div>
                </StepTransition>
              )}

              {/* STEP 3: Confirm */}
              {currentStep === 3 && (
                <StepTransition key="confirm">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-900 md:text-xl">
                        {t('playgrounds.booking.confirm.title', 'Review & confirm')}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {t(
                          'playgrounds.booking.confirm.subtitle',
                          'Please review all details before sending your request.'
                        )}
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Main summary */}
                      <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100 px-5 py-5 md:px-6 md:py-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                            <Trophy className="h-6 w-6 text-orange-600" />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div>
                              <h4 className="truncate text-base font-semibold text-slate-900">
                                {venue.name}
                              </h4>
                              {academy?.public_name && (
                                <p className="truncate text-sm text-slate-700">
                                  {academy.public_name}
                                </p>
                              )}
                            </div>

                            <div className="grid gap-4 text-sm md:grid-cols-2">
                              <div className="space-y-2.5">
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">
                                    {t('playgrounds.booking.labels.date', 'Date')}
                                  </span>
                                  <span className="font-semibold">{bookingDate || '—'}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">
                                    {t('playgrounds.booking.labels.time', 'Time')}
                                  </span>
                                  <span className="font-semibold">
                                    {selectedSlot?.start_time} – {selectedSlot?.end_time}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">
                                    {t('playgrounds.booking.labels.duration', 'Duration')}
                                  </span>
                                  <span className="font-semibold">
                                    {selectedDuration?.minutes}{' '}
                                    {t('playgrounds.booking.labels.minutesShort', 'min')}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2.5">
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">
                                    {t('playgrounds.booking.labels.players', 'Players')}
                                  </span>
                                  <span className="font-semibold">{players}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">
                                    {t('playgrounds.booking.labels.payment', 'Payment')}
                                  </span>
                                  <span className="capitalize font-semibold">{paymentType}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-600">
                                    {t('playgrounds.booking.labels.price', 'Price')}
                                  </span>
                                  <span className="text-xl font-bold text-orange-600">
                                    {basePrice != null ? basePrice : '—'}{' '}
                                    {t('playgrounds.booking.labels.currency', 'JOD')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Info / error */}
                      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="flex items-start gap-3">
                          <Shield className="h-5 w-5 text-emerald-500" />
                          <div className="space-y-1.5">
                            <p className="text-sm font-semibold text-slate-900">
                              {t('playgrounds.booking.confirm.secureTitle', 'Secure booking')}
                            </p>
                            <p className="text-sm text-slate-600">
                              {t(
                                'playgrounds.booking.confirm.secureText',
                                'Your booking request will be sent to the academy. They will confirm and contact you if needed.'
                              )}
                            </p>
                          </div>
                        </div>

                        {errorText && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                          >
                            <p className="text-sm text-red-700">{errorText}</p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </StepTransition>
              )}
            </AnimatePresence>
          </div>

          {/* Summary + navigation column */}
          <div className="hidden lg:flex min-h-[240px] flex-col border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-5 lg:border-l lg:border-t-0 lg:px-5 lg:py-6">
            {/* Summary */}
            <div className="space-y-5 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('playgrounds.booking.summary.title', 'Booking summary')}
              </h4>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">
                    {t('playgrounds.booking.labels.venue', 'Venue')}
                  </span>
                  <span className="max-w-[140px] truncate text-right font-semibold text-slate-900">
                    {venue.name}
                  </span>
                </div>

                {activityName && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">
                      {t('playgrounds.booking.labels.activity', 'Activity')}
                    </span>
                    <span className="max-w-[140px] truncate text-right font-semibold text-slate-900">
                      {activityName}
                    </span>
                  </div>
                )}

                {academy?.public_name && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">
                      {t('playgrounds.booking.labels.academy', 'Academy')}
                    </span>
                    <span className="max-w-[140px] truncate text-right font-semibold text-slate-900">
                      {academy.public_name}
                    </span>
                  </div>
                )}

                {bookingDate && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">
                      {t('playgrounds.booking.labels.date', 'Date')}
                    </span>
                    <span className="font-semibold text-slate-900">{bookingDate}</span>
                  </div>
                )}

                {selectedSlot && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">
                      {t('playgrounds.booking.labels.time', 'Time')}
                    </span>
                    <span className="font-semibold text-slate-900">{selectedSlot.start_time}</span>
                  </div>
                )}

                {selectedDuration && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">
                      {t('playgrounds.booking.labels.duration', 'Duration')}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {selectedDuration.minutes}{' '}
                      {t('playgrounds.booking.labels.minutesShort', 'min')}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">
                    {t('playgrounds.booking.labels.players', 'Players')}
                  </span>
                  <span className="font-semibold text-slate-900">{players}</span>
                </div>
              </div>

              {basePrice != null && (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-700">
                      {t('playgrounds.booking.summary.sessionPrice', 'Session price')}
                    </span>
                    <span className="text-xl font-bold text-orange-600">
                      {basePrice} {t('playgrounds.booking.labels.currency', 'JOD')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t(
                      'playgrounds.booking.summary.finalAmountNote',
                      'Final amount will be confirmed by the academy.'
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="mt-5 space-y-3">
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl text-sm"
                      onClick={handlePrevStep}
                    >
                      {t('playgrounds.booking.actions.back', 'Back')}
                    </Button>
                  </motion.div>
                )}

                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-sm text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600"
                    onClick={handleNextStep}
                    disabled={
                      currentStep === 0 && (!selectedDurationId || !bookingDate || !selectedSlot)
                    }
                  >
                    {t('playgrounds.booking.actions.continue', 'Continue')}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1"
                  >
                    <Button
                      type="button"
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-sm text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-green-600"
                      disabled={!canSubmit || submitting}
                      onClick={handleSubmitBooking}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('playgrounds.booking.actions.processing', 'Processing...')}
                        </>
                      ) : (
                        <>
                          {t('playgrounds.booking.actions.confirmBooking', 'Confirm booking')}
                          <Check className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl text-sm text-slate-600 hover:text-slate-900"
                onClick={onClose}
              >
                {t('playgrounds.booking.actions.cancelBooking', 'Cancel booking')}
              </Button>
            </div>

            {/* Help box */}
            <div className="mt-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    {t('playgrounds.booking.help.title', 'Need help?')}
                  </p>
                  <p className="text-xs text-blue-700">
                    {t(
                      'playgrounds.booking.help.text',
                      'Contact {{academy}} directly for any questions.',
                      {
                        academy:
                          academy?.public_name ||
                          t('playgrounds.booking.help.defaultAcademy', 'the academy'),
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Guest quick-registration overlay */}
        {userMode === 'guest' && guestDialogOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mx-4 w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-900">
                      {t('playgrounds.booking.guest.title', 'Quick account for your booking')}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {t(
                        'playgrounds.booking.guest.subtitle',
                        'We will create a free account and send your password by SMS.'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGuestDialogOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-700">
                    {t('common.firstName', 'First name')}
                  </Label>
                  <Input
                    value={guestForm.first_name}
                    onChange={(e) =>
                      setGuestForm((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-700">
                    {t('common.lastName', 'Last name')}
                  </Label>
                  <Input
                    value={guestForm.last_name}
                    onChange={(e) =>
                      setGuestForm((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <Phone className="h-4 w-4 text-orange-500" />
                  {t('auth.fields.phone', 'Phone number')}
                </Label>
                <Input
                  type="tel"
                  value={guestForm.phone}
                  onChange={(e) =>
                    setGuestForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="h-10 rounded-xl text-sm"
                  placeholder={t('auth.fields.phone.placeholder', '+962 7XX XXX XXX')}
                />
              </div>

              {guestError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
                >
                  {guestError}
                </motion.div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl text-sm"
                  onClick={() => setGuestDialogOpen(false)}
                  disabled={guestSubmitting}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  type="button"
                  className="h-10 flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-sm text-white shadow-lg shadow-orange-500/25"
                  onClick={handleGuestQuickRegister}
                  disabled={guestSubmitting}
                >
                  {guestSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.pleaseWait', 'Please wait…')}
                    </>
                  ) : (
                    <>
                      {t('playgrounds.booking.guest.actions.continue', 'Continue & send SMS')}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-slate-500">
                {t(
                  'playgrounds.booking.guest.note',
                  'We only use your phone to manage your bookings and send you your login details.'
                )}
              </p>
            </motion.div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}