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
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CliqUploadCard } from '../../components/playgrounds/CliqUploadCard';
import { PaymentMethodCard } from '../../components/playgrounds/PaymentMethodCard';
import { SlotGrid } from '../../components/playgrounds/SlotGrid';
import { StepperHeader } from '../../components/playgrounds/StepperHeader';
import { SuccessReceiptSheet } from '../../components/playgrounds/SuccessReceiptSheet';
import { goToMyBookings } from '../../navigation/playgrounds.routes';
import { playgroundsStore } from '../../services/playgrounds/playgrounds.store';
import { usePlaygroundsAuth } from '../../services/playgrounds/playgrounds.store';
import { useVenue } from '../../services/playgrounds/playgrounds.hooks';

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

export const PlaygroundsBookingStepperScreen = () => {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const { publicUserId } = usePlaygroundsAuth();
  const { data: venueData } = useVenue(venueId);
  const venue = venueData || {};
  const resolvedVenueId = Array.isArray(venueId) ? venueId[0] : venueId;

  const durations = useMemo(() => (
    Array.isArray(venue?.duration) ? venue.duration : []
  ), [venue?.duration]);

  const [step, setStep] = useState(0);
  const [duration, setDuration] = useState(durations[0] || null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [players, setPlayers] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [cashOnDateFlag, setCashOnDateFlag] = useState(false);
  const [cliqImage, setCliqImage] = useState(null);
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
    if (!duration?.minutes || !date) return;
    let active = true;
    setLoadingSlots(true);
    playgroundsStore.fetchSlots(resolvedVenueId, {
      date,
      duration_minutes: duration.minutes,
    }).then((res) => {
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
  }, [date, duration, resolvedVenueId]);

  useEffect(() => {
    const hours = duration?.minutes ? duration.minutes / 60 : 0;
    const price = duration?.base_price ?? venue?.price ?? 0;
    const nextTotal = Number(price) * hours;
    setTotalPrice(Number.isFinite(nextTotal) ? nextTotal : 0);
  }, [duration, venue?.price]);

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
          name: 'cliq-receipt.jpg',
          type: 'image/jpeg',
        });
        res = await playgroundsStore.createBooking(formData);
      } else {
        res = await playgroundsStore.createBooking(payload);
      }

      if (!res?.success) {
        setError('Booking failed. Please review your details.');
        return;
      }

      setSuccessBooking({
        id: res?.data?.id || res?.data?.booking_id || '0001',
        venue: venue?.name || 'Playground',
        time: formatSlotLabel(selectedSlot),
        amount: `${totalPrice} JOD`,
        payment: paymentType,
      });
      setStep(4);
    } catch (err) {
      setError('Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
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

  const renderStep = () => {
    if (step === 0) {
      return (
        <View>
          <Text style={styles.sectionTitle}>Choose Duration</Text>
          <View style={styles.durationRow}>
            {durations.map((option) => {
              const isSelected = duration?.id === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.durationChip, isSelected && styles.durationChipActive]}
                  onPress={() => setDuration(option)}
                >
                  <Text style={[styles.durationText, isSelected && styles.durationTextActive]}>
                    {option?.minutes ? `${option.minutes} min` : 'Duration'}
                  </Text>
                  <Text style={styles.durationSubText}>{option?.base_price ?? 'N/A'} JOD</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Select Date</Text>
          <TextInput
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>Available Slots</Text>
          {loadingSlots ? <Text style={styles.helper}>Loading slots...</Text> : null}
          <SlotGrid
            slots={slots}
            selectedSlotId={selectedSlot?.id || selectedSlot?.start_time}
            onSelect={setSelectedSlot}
          />
        </View>
      );
    }

    if (step === 1) {
      return (
        <View>
          <Text style={styles.sectionTitle}>Players Count</Text>
          <TextInput
            placeholder="Number of players"
            keyboardType="number-pad"
            value={players}
            onChangeText={setPlayers}
            style={styles.input}
          />
        </View>
      );
    }

    if (step === 2) {
      return (
        <View>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentOptions.map((option) => (
            <PaymentMethodCard
              key={option.id}
              title={option.title}
              subtitle={option.subtitle}
              selected={paymentType === option.id}
              onPress={() => setPaymentType(option.id)}
            />
          ))}
          {paymentType === 'cliq' ? (
            <CliqUploadCard
              uploading={false}
              onUpload={() => setCliqImage('file://cliq-receipt.jpg')}
            />
          ) : null}
        </View>
      );
    }

    if (step === 3) {
      return (
        <View>
          <Text style={styles.sectionTitle}>Review</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryItem}>Venue: {venue?.name || 'Playground'}</Text>
            <Text style={styles.summaryItem}>Date: {date || 'N/A'}</Text>
            <Text style={styles.summaryItem}>Time: {formatSlotLabel(selectedSlot)}</Text>
            <Text style={styles.summaryItem}>Duration: {duration?.minutes ? `${duration.minutes} min` : 'N/A'}</Text>
            <Text style={styles.summaryItem}>Players: {players}</Text>
            <Text style={styles.summaryItem}>Payment: {paymentType}</Text>
            <Text style={styles.summaryTotal}>Total: {totalPrice} JOD</Text>
          </View>
        </View>
      );
    }

    return (
      <View>
        <SuccessReceiptSheet booking={successBooking} />
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => goToMyBookings(router)}
        >
          <Text style={styles.primaryButtonText}>Go to My Bookings</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <StepperHeader steps={steps} currentStep={step} />
        <Animated.View key={step} entering={FadeInRight} exiting={FadeOutLeft}>
          {renderStep()}
        </Animated.View>

        {validationMessage ? <Text style={styles.validation}>{validationMessage}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step < steps.length - 1 ? (
          <View style={styles.actions}>
            {step > 0 ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.actionPrimary, !canProceedStep && styles.disabledButton]}
              onPress={step === 3 ? handleSubmit : handleNext}
              disabled={!canProceedStep || submitting}
            >
              <Text style={styles.primaryButtonText}>
                {step === 3 ? (submitting ? 'Submitting...' : 'Submit') : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11223A',
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
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F4FA',
  },
  durationChipActive: {
    backgroundColor: '#4F6AD7',
  },
  durationText: {
    fontSize: 12,
    color: '#6C7A92',
    fontWeight: '600',
  },
  durationSubText: {
    fontSize: 11,
    color: '#6C7A92',
    marginTop: 2,
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  input: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E6F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#11223A',
  },
  helper: {
    fontSize: 12,
    color: '#6C7A92',
    marginLeft: 16,
  },
  summaryCard: {
    marginHorizontal: 16,
    backgroundColor: '#F7F9FF',
    borderRadius: 18,
    padding: 16,
  },
  summaryItem: {
    fontSize: 12,
    color: '#6C7A92',
    marginBottom: 6,
  },
  summaryTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11223A',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  actionPrimary: {
    flex: 1,
    backgroundColor: '#4F6AD7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButton: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#4F6AD7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    marginRight: 12,
    backgroundColor: '#EFF3FF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4F6AD7',
    fontWeight: '600',
  },
  validation: {
    fontSize: 12,
    color: '#D64545',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  error: {
    fontSize: 12,
    color: '#D64545',
    paddingHorizontal: 16,
    marginTop: 10,
  },
});
