// Playgrounds booking stepper flow with validation and animated transitions.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { launchImageLibrary } from 'react-native-image-picker';

import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { StepperHeader } from '../../components/playgrounds/StepperHeader';
import { SlotGrid } from '../../components/playgrounds/SlotGrid';
import { PaymentMethodCard } from '../../components/playgrounds/PaymentMethodCard';
import { CliqUploadCard } from '../../components/playgrounds/CliqUploadCard';
import { SuccessReceiptSheet } from '../../components/playgrounds/SuccessReceiptSheet';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { playgroundsStore } from '../../services/playgrounds/playgrounds.store';

const STEPS = [
  'Pick a date',
  'Choose duration',
  'Select a slot',
  'Pick start time',
  'Players count',
  'Payment method',
  'Review & submit',
  'Success',
];

const fallbackDurations = [
  { id: '60', minutes: 60, label: '60 min' },
  { id: '90', minutes: 90, label: '90 min' },
  { id: '120', minutes: 120, label: '120 min' },
];

const paymentOptions = [
  { key: 'cash', label: 'Pay now (cash)' },
  { key: 'cash_payment_on_date', label: 'Pay at venue' },
  { key: 'cliq', label: 'CliQ transfer' },
];

export function PlaygroundsBookingStepperScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const venueId = params?.venueId || params?.id || null;
  const durationMinutesParam = params?.durationMinutes ? Number(params.durationMinutes) : null;
  const durationIdParam = params?.durationId || null;

  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [duration, setDuration] = useState(
    durationMinutesParam
      ? { id: durationIdParam || String(durationMinutesParam), minutes: durationMinutesParam, label: `${durationMinutesParam} min` }
      : fallbackDurations[0]
  );
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [playersCount, setPlayersCount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResponse, setBookingResponse] = useState(null);
  const [validationStep, setValidationStep] = useState(null);
  const [checkingIdentity, setCheckingIdentity] = useState(true);

  const formattedDate = useMemo(
    () => selectedDate.toISOString().split('T')[0],
    [selectedDate]
  );

  useEffect(() => {
    let mounted = true;
    playgroundsStore.getPublicUserId().then((publicUserId) => {
      if (!mounted) return;
      if (!publicUserId) {
        router.replace('/playgrounds/identify');
      }
      setCheckingIdentity(false);
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  const loadSlots = useCallback(async () => {
    if (!venueId || !duration?.minutes) return;
    setSlotsLoading(true);
    const response = await playgroundsApi.fetchSlots({
      venue_id: venueId,
      date: formattedDate,
      duration_minutes: duration.minutes,
    });
    const data = response?.success ? response.data : [];
    const normalized = Array.isArray(data) ? data : data?.slots || [];
    setSlots(normalized);
    setSlotsLoading(false);
  }, [venueId, duration, formattedDate]);

  const slotOptions = useMemo(() => {
    if (!slots.length) return [];
    return slots.map((slot, index) => ({
      id: slot.id?.toString?.() || String(index),
      label: slot.label || slot.time || slot.start_time || slot.startTime || 'Available',
      price: slot.price ? `AED ${slot.price}` : 'From AED 120',
    }));
  }, [slots]);

  const startTimes = useMemo(() => {
    if (!slots.length) return [];
    return slots.map((slot, index) => ({
      id: slot.id?.toString?.() || String(index),
      label: slot.start_time || slot.time || slot.label || 'Available',
    }));
  }, [slots]);

  const handlePickReceipt = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    const asset = result?.assets?.[0];
    if (!asset) return;
    setReceipt(asset);
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(selectedDate);
      case 1:
        return Boolean(duration);
      case 2:
        return Boolean(selectedSlot);
      case 3:
        return Boolean(startTime);
      case 4:
        return Boolean(playersCount && Number(playersCount) > 0);
      case 5:
        return paymentType !== 'cliq' || Boolean(receipt);
      default:
        return true;
    }
  }, [step, selectedDate, duration, selectedSlot, startTime, playersCount, paymentType, receipt]);

  const handleNext = async () => {
    if (!canProceed) {
      setValidationStep(step);
      return;
    }
    setValidationStep(null);
    if (step === 1) {
      await loadSlots();
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setValidationStep(null);
    const payload = {
      venue_id: venueId,
      date: formattedDate,
      duration_minutes: duration?.minutes,
      slot_id: selectedSlot?.id,
      start_time: startTime,
      players_count: Number(playersCount),
      payment_type: paymentType,
    };

    let response;
    if (paymentType === 'cliq' && receipt) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('receipt', {
        uri: receipt.uri,
        name: receipt.fileName || 'receipt.jpg',
        type: receipt.type || 'image/jpeg',
      });
      response = await playgroundsApi.createBooking(formData, { contentType: 'multipart/form-data' });
    } else {
      response = await playgroundsApi.createBooking(payload);
    }

    if (response?.success) {
      setBookingResponse(response.data || payload);
      setStep(7);
    }

    setSubmitting(false);
  };

  if (checkingIdentity) {
    return (
      <Screen>
        <LoadingState message="Preparing your booking..." />
      </Screen>
    );
  }

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="body" weight="bold">
              Choose your booking date
            </Text>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (date) setSelectedDate(date);
              }}
            />
          </View>
        );
      case 1:
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="body" weight="bold">
              How long would you like to play?
            </Text>
            <View style={styles.durationRow}>
              {fallbackDurations.map((item) => {
                const active = duration?.id === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setDuration(item)}
                    style={[
                      styles.durationChip,
                      {
                        backgroundColor: active ? colors.accentOrange : colors.surface,
                        borderColor: active ? colors.accentOrange : colors.border,
                      },
                    ]}
                  >
                    <Text variant="bodySmall" weight="bold" color={active ? colors.white : colors.textPrimary}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      case 2:
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="body" weight="bold">
              Available slots
            </Text>
            {slotsLoading ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator color={colors.accentOrange} />
                <Text variant="caption" color={colors.textMuted}>
                  Loading slots...
                </Text>
              </View>
            ) : slotOptions.length === 0 ? (
              <View style={styles.emptySlots}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  No slots available for this date and duration.
                </Text>
                <Button variant="secondary" onPress={loadSlots}>
                  Retry
                </Button>
              </View>
            ) : (
              <SlotGrid
                slots={slotOptions}
                selectedSlot={selectedSlot}
                onSelect={(slot) => setSelectedSlot(slot)}
              />
            )}
            {validationStep === 2 && !selectedSlot ? (
              <Text variant="caption" color={colors.error}>
                Please select a slot to continue.
              </Text>
            ) : null}
          </View>
        );
      case 3:
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="body" weight="bold">
              Choose a start time
            </Text>
            <View style={styles.durationRow}>
              {startTimes.map((time) => {
                const active = startTime === time.label;
                return (
                  <Pressable
                    key={time.id}
                    onPress={() => setStartTime(time.label)}
                    style={[
                      styles.durationChip,
                      {
                        backgroundColor: active ? colors.accentOrange : colors.surface,
                        borderColor: active ? colors.accentOrange : colors.border,
                      },
                    ]}
                  >
                    <Text variant="bodySmall" weight="bold" color={active ? colors.white : colors.textPrimary}>
                      {time.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      case 4:
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="body" weight="bold">
              Players count
            </Text>
            <Input
              placeholder="Number of players"
              keyboardType="number-pad"
              value={playersCount}
              onChangeText={setPlayersCount}
              error={validationStep === 4 && !playersCount ? 'Enter the number of players.' : ''}
            />
          </View>
        );
      case 5:
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="body" weight="bold">
              Payment method
            </Text>
            <View style={styles.paymentStack}>
              {paymentOptions.map((option) => (
                <PaymentMethodCard
                  key={option.key}
                  title={option.label}
                  subtitle={option.key === 'cliq' ? 'Upload receipt required' : 'Secure payout'}
                  active={paymentType === option.key}
                  onPress={() => setPaymentType(option.key)}
                />
              ))}
            </View>
            {paymentType === 'cliq' ? (
              <CliqUploadCard
                title={receipt ? receipt.fileName || 'Receipt selected' : 'Upload CliQ receipt'}
                subtitle={receipt ? 'Ready to submit' : 'Tap to add proof of payment'}
                onPress={handlePickReceipt}
              />
            ) : null}
            {validationStep === 5 && paymentType === 'cliq' && !receipt ? (
              <Text variant="caption" color={colors.error}>
                Please attach your CliQ receipt to continue.
              </Text>
            ) : null}
          </View>
        );
      case 6:
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="body" weight="bold">
              Review booking
            </Text>
            <View style={[styles.summaryCard, { borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text variant="caption" color={colors.textMuted}>
                  Date
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {formattedDate}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="caption" color={colors.textMuted}>
                  Time
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {startTime || '—'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="caption" color={colors.textMuted}>
                  Duration
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {duration?.label}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="caption" color={colors.textMuted}>
                  Players
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {playersCount}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="caption" color={colors.textMuted}>
                  Payment
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {paymentOptions.find((option) => option.key === paymentType)?.label}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="caption" color={colors.textMuted}>
                  Total
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  AED 240
                </Text>
              </View>
            </View>
          </View>
        );
      case 7:
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <SuccessReceiptSheet
              title="Booking confirmed"
              subtitle="Your court is secured and ready"
              items={[
                { label: 'Booking ID', value: bookingResponse?.booking_id || bookingResponse?.id || '—' },
                { label: 'Code', value: bookingResponse?.booking_code || bookingResponse?.code || '—' },
                { label: 'Total', value: bookingResponse?.total_price || 'AED 240' },
              ]}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <StepperHeader step={step} steps={STEPS} />

      <Animated.View
        key={`step-${step}`}
        entering={FadeInRight.duration(220)}
        exiting={FadeOutLeft.duration(180)}
        layout={Layout.springify()}
      >
        {renderStepContent()}
      </Animated.View>

      {step < 7 ? (
        <View style={styles.footer}>
          <Button variant="secondary" onPress={handleBack} disabled={step === 0} style={styles.footerButton}>
            Back
          </Button>
          {step === 6 ? (
            <Button
              onPress={handleSubmit}
              loading={submitting}
              disabled={!canProceed || submitting}
              style={styles.footerButton}
            >
              Confirm booking
            </Button>
          ) : (
            <Button onPress={handleNext} disabled={!canProceed} style={styles.footerButton}>
              Next
            </Button>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minWidth: 110,
    alignItems: 'center',
  },
  loadingBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptySlots: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  paymentStack: {
    gap: spacing.sm,
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  footerButton: {
    flex: 1,
  },
});
