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
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { useVenue } from '../../services/playgrounds/playgrounds.hooks';

const steps = ['Duration & Time', 'Players', 'Payment', 'Review', 'Success'];

const durationOptions = [
  { id: '60', minutes: 60, label: '60 min' },
  { id: '90', minutes: 90, label: '90 min' },
  { id: '120', minutes: 120, label: '120 min' },
];

const paymentOptions = [
  { id: 'cash', title: 'Cash', subtitle: 'Pay in person' },
  { id: 'cash_payment_on_date', title: 'Pay on Date', subtitle: 'Secure your slot with pay-on-date' },
  { id: 'cliq', title: 'CliQ Transfer', subtitle: 'Upload receipt after payment' },
];

export const PlaygroundsBookingStepperScreen = () => {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const { data: venueData } = useVenue(venueId);
  const venue = venueData || {};
  const resolvedVenueId = Array.isArray(venueId) ? venueId[0] : venueId;

  const [step, setStep] = useState(0);
  const [duration, setDuration] = useState(durationOptions[0]);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [players, setPlayers] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [cliqImage, setCliqImage] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);
  const [successBooking, setSuccessBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const pricePerHour = venue?.price_per_hour || 15;

  useEffect(() => {
    if (!duration?.minutes || !date) return;
    let active = true;
    setLoadingSlots(true);
    playgroundsApi.fetchSlots({
      venue_id: resolvedVenueId,
      date,
      duration_minutes: duration.minutes,
    }).then((res) => {
      if (!active) return;
      if (!res?.success) {
        setError('Unable to load slots. Please try another date.');
        setSlots([]);
      } else {
        setError(null);
        setSlots(res.data || []);
      }
      setLoadingSlots(false);
    });
    return () => {
      active = false;
    };
  }, [date, duration, venueId]);

  useEffect(() => {
    const hours = duration?.minutes ? duration.minutes / 60 : 0;
    const nextTotal = hours * pricePerHour;
    setTotalPrice(Number.isFinite(nextTotal) ? nextTotal : 0);
  }, [duration, pricePerHour]);

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
        venue_id: resolvedVenueId,
        date,
        duration_minutes: duration?.minutes,
        slot_id: selectedSlot?.id || selectedSlot?.slot_id,
        players: Number(players),
        payment_type: paymentType,
      };

      let res;
      if (paymentType === 'cliq' && cliqImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value != null) formData.append(key, String(value));
        });
        formData.append('receipt', {
          uri: cliqImage,
          name: 'cliq-receipt.jpg',
          type: 'image/jpeg',
        });
        res = await playgroundsApi.createBooking(formData, { contentType: 'multipart/form-data' });
      } else {
        res = await playgroundsApi.createBooking(payload);
      }

      if (!res?.success) {
        setError('Booking failed. Please review your details.');
        return;
      }

      setSuccessBooking({
        id: res?.data?.id || res?.data?.booking_id || '0001',
        venue: venue?.name || 'Playground',
        time: selectedSlot?.label || selectedSlot?.time || 'TBD',
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
            {durationOptions.map((option) => {
              const isSelected = duration?.id === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.durationChip, isSelected && styles.durationChipActive]}
                  onPress={() => setDuration(option)}
                >
                  <Text style={[styles.durationText, isSelected && styles.durationTextActive]}>
                    {option.label}
                  </Text>
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
            slots={slots.length ? slots : [{ id: '1', label: '6:00 PM' }, { id: '2', label: '7:00 PM' }]}
            selectedSlotId={selectedSlot?.id}
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
            <Text style={styles.summaryItem}>Date: {date}</Text>
            <Text style={styles.summaryItem}>Time: {selectedSlot?.label || selectedSlot?.time || 'TBD'}</Text>
            <Text style={styles.summaryItem}>Duration: {duration?.label}</Text>
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
    marginTop: 20,
    paddingHorizontal: 16,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EFF3FF',
  },
  durationChipActive: {
    backgroundColor: '#4F6AD7',
  },
  durationText: {
    fontSize: 12,
    color: '#4F6AD7',
    fontWeight: '600',
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  input: {
    marginTop: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E6F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  helper: {
    paddingHorizontal: 16,
    marginTop: 8,
    fontSize: 12,
    color: '#6C7A92',
  },
  summaryCard: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F4F7FF',
  },
  summaryItem: {
    fontSize: 13,
    color: '#2E3A52',
    marginBottom: 8,
  },
  summaryTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11223A',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  actionPrimary: {
    flex: 1,
    backgroundColor: '#4F6AD7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4F6AD7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#EFF3FF',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4F6AD7',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  validation: {
    marginTop: 12,
    marginHorizontal: 16,
    color: '#6C7A92',
    fontSize: 12,
  },
  error: {
    marginTop: 12,
    marginHorizontal: 16,
    color: '#D64545',
    fontSize: 12,
  },
});
