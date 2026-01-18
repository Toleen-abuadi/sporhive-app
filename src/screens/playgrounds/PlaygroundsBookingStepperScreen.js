// API fields used: venue.duration (id, minutes, base_price), slots (start_time, end_time),
// booking payload fields: academy_profile_id, user_id, activity_id, venue_id, duration_id,
// booking_date, start_time, number_of_players, payment_type, cash_payment_on_date, cliq_image.
import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CliqUploadCard } from '../../components/playgrounds/CliqUploadCard';
import { PaymentMethodCard } from '../../components/playgrounds/PaymentMethodCard';
import { SlotGrid } from '../../components/playgrounds/SlotGrid';
import { StepperHeader } from '../../components/playgrounds/StepperHeader';
import { StickyFooterCTA } from '../../components/playgrounds/StickyFooterCTA';
import { SuccessReceiptSheet } from '../../components/playgrounds/SuccessReceiptSheet';
import { goToMyBookings } from '../../navigation/playgrounds.routes';
import { usePlaygroundsAuth, usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { useVenue } from '../../services/playgrounds/playgrounds.hooks';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

const steps = ['Duration & Time', 'Players', 'Payment', 'Review', 'Success'];

const paymentOptions = [
  { id: 'cash', title: 'Cash', subtitle: 'Pay in person' },
  { id: 'cash_payment_on_date', title: 'Pay on Date', subtitle: 'Secure your slot with pay-on-date' },
  { id: 'cliq', title: 'CliQ Transfer', subtitle: 'Upload receipt after payment' },
];

const formatSlotLabel = (slot) => {
  if (!slot) return 'Slot';
  if (slot?.start_time && slot?.end_time) return `${slot.start_time} - ${slot.end_time}`;
  return slot?.start_time || slot?.end_time || 'Slot';
};

const buildDatePills = (count = 7) => {
  const today = new Date();
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const label = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
    const value = date.toISOString().split('T')[0];
    return { label, day, monthLabel, value };
  });
};

const resolvePaymentMethods = (venue) => {
  const raw =
    venue?.academy_profile?.payment_methods ||
    venue?.payment_methods ||
    venue?.payment_type ||
    [];
  const methods = new Set();
  if (Array.isArray(raw)) {
    raw.forEach((method) => methods.add(String(method).toLowerCase()));
  } else if (typeof raw === 'string') {
    methods.add(raw.toLowerCase());
  }

  if (venue?.academy_profile?.allow_cash || venue?.allow_cash) methods.add('cash');
  if (venue?.academy_profile?.allow_cliq || venue?.allow_cliq) methods.add('cliq');
  if (venue?.academy_profile?.allow_cash_payment_on_date || venue?.allow_cash_payment_on_date) {
    methods.add('cash_payment_on_date');
  }

  if (methods.size === 0) {
    return ['cash', 'cash_payment_on_date', 'cliq'];
  }

  return Array.from(methods);
};

export const PlaygroundsBookingStepperScreen = () => {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);
  const playgrounds = usePlaygroundsStore();
  const { publicUserId } = usePlaygroundsAuth();
  const { data: venueData } = useVenue(venueId);
  const venue = venueData || {};
  const resolvedVenueId = Array.isArray(venueId) ? venueId[0] : venueId;

  const [availableDurations, setAvailableDurations] = useState([]);
  const [availableActivities, setAvailableActivities] = useState([]);
  const durations = useMemo(() => {
    if (availableDurations.length) return availableDurations;
    return Array.isArray(venue?.duration) ? venue.duration : [];
  }, [availableDurations, venue?.duration]);
  const datePills = useMemo(() => buildDatePills(7), []);

  const [step, setStep] = useState(0);
  const [duration, setDuration] = useState(durations[0] || null);
  const [date, setDate] = useState(datePills[0]?.value || '');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [players, setPlayers] = useState(venue?.min_players || 1);
  const [paymentType, setPaymentType] = useState('');
  const [cashOnDateFlag, setCashOnDateFlag] = useState(false);
  const [cliqImage, setCliqImage] = useState(null);
  const [cliqFileName, setCliqFileName] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);
  const [successBooking, setSuccessBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (durations.length && !duration) {
      setDuration(durations[0]);
    }
  }, [durations, duration]);

  useEffect(() => {
    const durationMinutes = duration?.minutes ?? duration?.duration_minutes;
    if (!durationMinutes || !date) return;
    let active = true;
    setLoadingSlots(true);
    playgrounds
      .fetchSlots(resolvedVenueId, {
        date,
        duration_minutes: durationMinutes,
      })
      .then((res) => {
        if (!active) return;
        if (!res?.success) {
          setError('Unable to load slots. Please try another date.');
          setSlots([]);
        } else {
          setError(null);
          setSlots(Array.isArray(res.data) ? res.data : []);
        }
        setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [date, duration, playgrounds, resolvedVenueId]);

  useEffect(() => {
    const minutes = duration?.minutes ?? duration?.duration_minutes;
    const hours = minutes ? minutes / 60 : 0;
    const price = duration?.base_price ?? duration?.price ?? venue?.price ?? 0;
    const nextTotal = Number(price) * hours;
    setTotalPrice(Number.isFinite(nextTotal) ? nextTotal : 0);
  }, [duration, venue?.price]);

  useEffect(() => {
    const academyId =
      venue?.academy_profile?.academy_id ||
      venue?.academy_id ||
      venue?.academy_profile_id;
    if (academyId) {
      playgrounds.fetchActivities(academyId).then((res) => {
        if (res?.success) {
          setAvailableActivities(Array.isArray(res.data) ? res.data : []);
        }
      });
    }
    if (resolvedVenueId) {
      playgrounds.fetchVenueDurations(resolvedVenueId).then((res) => {
        if (res?.success) {
          setAvailableDurations(Array.isArray(res.data) ? res.data : []);
        }
      });
    }
  }, [playgrounds, resolvedVenueId, venue]);

  useEffect(() => {
    if (paymentType === 'cash_payment_on_date') {
      setCashOnDateFlag(true);
    } else {
      setCashOnDateFlag(false);
    }
  }, [paymentType]);

  const canProceedStep = useMemo(() => {
    if (step === 0) return duration && date && selectedSlot;
    if (step === 1) return Number(players) > 0;
    if (step === 2) return paymentType && (paymentType !== 'cliq' || cliqImage);
    return true;
  }, [step, duration, date, selectedSlot, players, paymentType, cliqImage]);

  const handleNext = () => {
    if (!canProceedStep) {
      setShowValidation(true);
      return;
    }
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    setShowValidation(false);
  }, [step]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        academy_profile_id: venue?.academy_profile_id,
        user_id: publicUserId,
        activity_id: venue?.activity_id,
        venue_id: venue?.id || resolvedVenueId,
        duration_id: duration?.id,
        booking_date: date,
        start_time: selectedSlot?.start_time,
        number_of_players: Number(players),
        payment_type: paymentType,
        cash_payment_on_date: cashOnDateFlag,
        cliq_image: paymentType === 'cliq' ? cliqImage : null,
      };

      let res;
      if (paymentType === 'cliq' && cliqImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value != null) formData.append(key, String(value));
        });
        formData.append('cliq_image', {
          uri: cliqImage,
          name: cliqFileName || 'cliq-receipt.jpg',
          type: 'image/jpeg',
        });
        res = await playgrounds.createBooking(formData);
      } else {
        res = await playgrounds.createBooking(payload);
      }

      if (!res?.success) {
        setError('Booking failed. Please review your details.');
        return;
      }

      setSuccessBooking(res?.data || null);
      setStep(4);
    } catch (err) {
      setError('Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCliqUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Media access is required to upload receipts.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setCliqImage(result.assets[0].uri);
      setCliqFileName(result.assets[0].fileName || 'cliq-receipt.jpg');
    }
  };

  const validationMessage = useMemo(() => {
    if (!showValidation) return null;
    if (step === 0) return 'Select a duration, date, and slot to continue.';
    if (step === 1) return 'Enter the number of players.';
    if (step === 2 && paymentType === 'cliq' && !cliqImage) return 'Upload your CliQ receipt to continue.';
    if (step === 2) return 'Choose a payment method.';
    return null;
  }, [showValidation, step, paymentType, cliqImage]);

  const allowedPaymentMethods = useMemo(() => resolvePaymentMethods(venue), [venue]);
  const activityLabel = useMemo(() => {
    const activityId = venue?.activity_id || venue?.activity?.id;
    const match = availableActivities.find((item) => item?.id === activityId || item?.activity_id === activityId);
    return match?.name || match?.activity_name || venue?.activity?.name || venue?.activity_name || '—';
  }, [availableActivities, venue]);

  useEffect(() => {
    if (paymentType && !allowedPaymentMethods.includes(paymentType)) {
      setPaymentType('');
    }
  }, [allowedPaymentMethods, paymentType]);

  const renderStep = () => {
    if (step === 0) {
      return (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Choose Duration</Text>
          <View style={styles.durationRow}>
            {durations.map((option) => {
              const isSelected = duration?.id === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.durationChip,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setDuration(option)}
                >
                  <Text style={[styles.durationText, { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary }]}>
                    {option?.minutes || option?.duration_minutes
                      ? `${option?.minutes ?? option?.duration_minutes} min`
                      : 'Duration'}
                  </Text>
                  <Text style={[styles.durationSubText, { color: isSelected ? '#FFFFFF' : theme.colors.textMuted }]}>
                    {option?.base_price ?? option?.price ?? 'N/A'} JOD
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {datePills.map((pill) => {
              const isSelected = date === pill.value;
              return (
                <TouchableOpacity
                  key={pill.value}
                  style={[
                    styles.datePill,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setDate(pill.value)}
                >
                  <Text style={[styles.dateLabel, { color: isSelected ? '#FFFFFF' : theme.colors.textMuted }]}>
                    {pill.label}
                  </Text>
                  <Text style={[styles.dateDay, { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary }]}>
                    {pill.day}
                  </Text>
                  <Text style={[styles.dateMonth, { color: isSelected ? '#FFFFFF' : theme.colors.textMuted }]}>
                    {pill.monthLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Available Slots</Text>
            {loadingSlots ? (
              <Text style={[styles.helper, { color: theme.colors.textMuted }]}>Loading slots...</Text>
            ) : null}
          </View>
          <SlotGrid
            slots={slots}
            selectedSlotId={selectedSlot?.id || selectedSlot?.start_time}
            onSelect={setSelectedSlot}
          />
        </View>
      );
    }

    if (step === 1) {
      const minPlayers = venue?.min_players || 1;
      const maxPlayers = venue?.max_players || 20;
      return (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Players Count</Text>
          <View style={[styles.playerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.stepperButton, { borderColor: theme.colors.border }]}
              onPress={() => setPlayers((prev) => Math.max(minPlayers, Number(prev) - 1))}
            >
              <Text style={[styles.stepperText, { color: theme.colors.textPrimary }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.playerValue, { color: theme.colors.textPrimary }]}>{players}</Text>
            <TouchableOpacity
              style={[styles.stepperButton, { borderColor: theme.colors.border }]}
              onPress={() => setPlayers((prev) => Math.min(maxPlayers, Number(prev) + 1))}
            >
              <Text style={[styles.stepperText, { color: theme.colors.textPrimary }]}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.helper, { color: theme.colors.textMuted }]}>
            Min {minPlayers} · Max {maxPlayers} players
          </Text>
          <TextInput
            placeholder="Number of players"
            keyboardType="number-pad"
            value={String(players)}
            onChangeText={(value) => setPlayers(value.replace(/[^0-9]/g, ''))}
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>
      );
    }

    if (step === 2) {
      return (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Payment Method</Text>
          {paymentOptions.map((option) => (
            <PaymentMethodCard
              key={option.id}
              title={option.title}
              subtitle={option.subtitle}
              selected={paymentType === option.id}
              disabled={!allowedPaymentMethods.includes(option.id)}
              onPress={() => setPaymentType(option.id)}
            />
          ))}
          {paymentType === 'cliq' ? (
            <CliqUploadCard
              uploading={false}
              onUpload={handleCliqUpload}
              fileName={cliqFileName}
            />
          ) : null}
        </View>
      );
    }

    if (step === 3) {
      return (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Review</Text>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.summaryItem, { color: theme.colors.textMuted }]}>
              Venue: {venue?.name || 'Playground'}
            </Text>
            <Text style={[styles.summaryItem, { color: theme.colors.textMuted }]}>
              Sport: {activityLabel}
            </Text>
            <Text style={[styles.summaryItem, { color: theme.colors.textMuted }]}>Date: {date || 'N/A'}</Text>
            <Text style={[styles.summaryItem, { color: theme.colors.textMuted }]}>
              Time: {formatSlotLabel(selectedSlot)}
            </Text>
            <Text style={[styles.summaryItem, { color: theme.colors.textMuted }]}>
              Duration: {duration?.minutes || duration?.duration_minutes ? `${duration?.minutes ?? duration?.duration_minutes} min` : 'N/A'}
            </Text>
            <Text style={[styles.summaryItem, { color: theme.colors.textMuted }]}>Players: {players}</Text>
            <Text style={[styles.summaryItem, { color: theme.colors.textMuted }]}>Payment: {paymentType}</Text>
            <Text style={[styles.summaryTotal, { color: theme.colors.textPrimary }]}>
              Total: {totalPrice} JOD
            </Text>
          </View>
          <View style={[styles.noticeCard, { backgroundColor: theme.colors.primarySoft }]}>
            <Text style={[styles.noticeText, { color: theme.colors.textPrimary }]}>
              You can cancel up to 24 hours before your booking time.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View>
        <SuccessReceiptSheet booking={successBooking} />
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => goToMyBookings(router)}
        >
          <Text style={styles.primaryButtonText}>Go to My Bookings</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const ctaLabel = step === 3 ? (submitting ? 'Submitting...' : 'Submit') : 'Continue';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <StepperHeader steps={steps} currentStep={step} />
          <Animated.View key={step} entering={FadeInRight} exiting={FadeOutLeft}>
            {renderStep()}
          </Animated.View>

          {validationMessage ? <Text style={[styles.validation, { color: theme.colors.error }]}>{validationMessage}</Text> : null}
          {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}

          {step > 0 && step < steps.length - 1 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={[styles.backText, { color: theme.colors.textMuted }]}>Back</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {step < steps.length - 1 ? (
          <StickyFooterCTA
            priceLabel="Total"
            priceValue={`${totalPrice} JOD`}
            buttonLabel={ctaLabel}
            onPress={step === 3 ? handleSubmit : handleNext}
            disabled={!canProceedStep || submitting}
            helperText={step === 0 ? 'Select a slot to continue' : undefined}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  durationSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  dateRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  datePill: {
    width: 72,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  dateMonth: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  helper: {
    fontSize: 12,
    marginLeft: 16,
  },
  input: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 12,
  },
  playerCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 18,
    fontWeight: '700',
  },
  playerValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  summaryItem: {
    fontSize: 12,
    marginBottom: 6,
  },
  summaryTotal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  noticeCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  validation: {
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  error: {
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  backButton: {
    marginTop: 10,
    marginLeft: 16,
  },
  backText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
