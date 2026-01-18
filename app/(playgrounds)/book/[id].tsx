import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen } from '../../../src/components/ui/Screen';
import { TopBar } from '../../../src/components/ui/TopBar';
import { PrimaryButton, StickyCTA } from '../../../src/components/ui/PrimaryButton';
import { spacing, typography } from '../../../src/theme/tokens';
import { Chip } from '../../../src/components/ui/Chip';
import { Card } from '../../../src/components/ui/Card';
import { TextField } from '../../../src/components/ui/TextField';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { STORAGE_KEYS } from '../../../src/services/storage/keys';
import { getJson, setJson } from '../../../src/services/storage/storage';
import {
  createBooking,
  listVenues,
  listSlots,
  listVenueDurations,
  quickRegister,
  type Duration,
  type Slot,
  type Venue,
} from '../../../src/features/playgrounds/api/playgrounds.api';
import { getVenueById } from '../../../src/features/playgrounds/store/venuesStore';
import { formatJodPrice, formatTime, getErrorMessage, isNetworkError } from '../../../src/features/playgrounds/utils';

const DEFAULT_PLAYERS = 2;
const TOTAL_STEPS = 3;

type BookingDraft = {
  venueId: string;
  academyProfileId: string;
  draft: {
    selectedDurationId?: string;
    bookingDate?: string;
    players?: number;
    selectedSlot?: { start_time: string; end_time: string };
    paymentType?: 'cash' | 'cliq';
    cashOnDate?: boolean;
    currentStep?: number;
  };
};

type CliqImage = { uri: string; name: string; type: string };

const getNextDates = (days = 7) => {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const next = new Date(today);
    next.setDate(today.getDate() + index);
    return next;
  });
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function BookingStepperModal() {
  const router = useRouter();
  const { id, step } = useLocalSearchParams();
  const venueId = Array.isArray(id) ? id[0] : id;
  const initialStep = Number(Array.isArray(step) ? step[0] : step);
  const [venue, setVenue] = useState<Venue | null>(() =>
    venueId ? getVenueById(venueId) : null,
  );
  const [loading, setLoading] = useState(!venue);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [currentStep, setCurrentStep] = useState(
    Number.isFinite(initialStep) && initialStep > 0 ? initialStep : 1,
  );
  const [durations, setDurations] = useState<Duration[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsRetryKey, setSlotsRetryKey] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [paymentType, setPaymentType] = useState<'cash' | 'cliq' | null>(null);
  const [cashOnDate, setCashOnDate] = useState(false);
  const [cliqImage, setCliqImage] = useState<CliqImage | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const priceValue = formatJodPrice(selectedDuration?.base_price ?? venue?.price ?? null);

  useEffect(() => {
    if (!venueId || venue) return;
    let isMounted = true;
    const fetchVenue = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await listVenues({ number_of_players: DEFAULT_PLAYERS });
        if (!isMounted) return;
        const match = response.find((item) => item.id === venueId) ?? null;
        setVenue(match);
      } catch (error) {
        if (!isMounted) return;
        if (isNetworkError(error)) {
          setErrorMessage(getErrorMessage(error, 'Network error. Please try again.'));
        } else {
          setErrorMessage(getErrorMessage(error, 'Unable to load booking details.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void fetchVenue();
    return () => {
      isMounted = false;
    };
  }, [venue, venueId, retryKey]);

  useEffect(() => {
    if (!venueId) return;
    let isMounted = true;
    const loadDraft = async () => {
      const draft = await getJson<BookingDraft>(STORAGE_KEYS.BOOKING_DRAFT);
      if (!isMounted || !draft || draft.venueId !== venueId) return;
      if (draft.draft.selectedDurationId) {
        const match = durations.find((item) => item.id === draft.draft.selectedDurationId) ?? null;
        setSelectedDuration(match);
      }
      setSelectedDate(draft.draft.bookingDate ?? null);
      setPlayers(draft.draft.players ?? DEFAULT_PLAYERS);
      setSelectedSlot(draft.draft.selectedSlot ?? null);
      setPaymentType(draft.draft.paymentType ?? null);
      setCashOnDate(draft.draft.cashOnDate ?? false);
      setCurrentStep(draft.draft.currentStep ?? 1);
    };
    void loadDraft();
    return () => {
      isMounted = false;
    };
  }, [durations, venueId]);

  useEffect(() => {
    if (!venueId) return;
    let isMounted = true;
    const loadDurations = async () => {
      const response = await listVenueDurations(venueId);
      if (!isMounted) return;
      setDurations(response);
      const defaultDuration = response.find((item) => item.is_default) ?? response[0] ?? null;
      setSelectedDuration(defaultDuration);
    };
    void loadDurations();
    return () => {
      isMounted = false;
    };
  }, [venueId]);

  useEffect(() => {
    if (!selectedDuration || !selectedDate || !venueId) return;
    let isMounted = true;
    const controller = new AbortController();
    const loadSlots = async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const response = await listSlots(
          {
            venue_id: venueId,
            date: selectedDate,
            duration_minutes: selectedDuration.minutes,
          },
          { signal: controller.signal },
        );
        if (isMounted) {
          setSlots(response);
        }
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return;
        setSlots([]);
        if (isNetworkError(error)) {
          setSlotsError(getErrorMessage(error, 'Network error. Please try again.'));
        } else {
          setSlotsError(getErrorMessage(error, 'Unable to load slots.'));
        }
      } finally {
        if (isMounted) {
          setSlotsLoading(false);
        }
      }
    };
    void loadSlots();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [selectedDate, selectedDuration, venueId, slotsRetryKey]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(formatDate(date));
  };

  const handlePickCliqImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setCliqImage({
        uri: asset.uri,
        name: asset.fileName ?? 'cliq-image.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const handleSaveDraftAndAuth = async () => {
    if (!venue) return;
    const draft: BookingDraft = {
      venueId: venue.id,
      academyProfileId: venue.academy_profile_id,
      draft: {
        selectedDurationId: selectedDuration?.id,
        bookingDate: selectedDate ?? undefined,
        players,
        selectedSlot: selectedSlot ?? undefined,
        paymentType: paymentType ?? undefined,
        cashOnDate,
        currentStep,
      },
    };
    await setJson(STORAGE_KEYS.BOOKING_DRAFT, draft);
    router.replace('/(playgrounds)/auth?from=booking');
  };

  const handleSubmitBooking = async (userId: string) => {
    if (!venue || !selectedDuration || !selectedDate || !selectedSlot || !paymentType) return;
    setSubmitting(true);
    try {
      await createBooking({
        academy_profile_id: venue.academy_profile_id,
        user_id: userId,
        activity_id: venue.activity_id,
        venue_id: venue.id,
        duration_id: selectedDuration.id,
        booking_date: selectedDate,
        start_time: selectedSlot.start_time,
        number_of_players: players,
        payment_type: paymentType,
        cash_payment_on_date: cashOnDate,
        cliq_image: paymentType === 'cliq' ? (cliqImage as unknown as File) : null,
      });
      router.replace('/(playgrounds)/my-bookings');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      const user = await getJson<{ id: string }>(STORAGE_KEYS.PUBLIC_USER);
      const client = await getJson(STORAGE_KEYS.PLAYGROUNDS_CLIENT);
      if (user?.id) {
        await handleSubmitBooking(user.id);
        return;
      }
      if (!client) {
        setCurrentStep(3);
        return;
      }
      await handleSaveDraftAndAuth();
      return;
    }
    if (currentStep === 3) {
      if (!firstName || !lastName || !phone) return;
      try {
        const user = await quickRegister({ first_name: firstName, last_name: lastName, phone });
        await setJson(STORAGE_KEYS.PUBLIC_USER, user);
        await handleSubmitBooking(user.id);
      } catch (error) {
        const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
        if (/already|exists|registered/i.test(message)) {
          await handleSaveDraftAndAuth();
          return;
        }
      }
    }
  };

  const minPlayers = venue?.min_players ?? 1;
  const maxPlayers = venue?.max_players ?? 14;

  const step1Valid = Boolean(selectedDuration && selectedDate && selectedSlot && players >= minPlayers && players <= maxPlayers);
  const step2Valid = Boolean(paymentType && (paymentType !== 'cliq' || cliqImage));
  const step3Valid = Boolean(firstName && lastName && phone);

  const isPrimaryDisabled =
    submitting ||
    (currentStep === 1 && !step1Valid) ||
    (currentStep === 2 && !step2Valid) ||
    (currentStep === 3 && !step3Valid);

  if (loading) {
    return (
      <Screen>
        <TopBar title="Booking" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <Skeleton height={220} radius={20} />
          <Skeleton height={18} width="60%" />
          <Skeleton height={44} width={160} radius={16} />
        </View>
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen>
        <TopBar title="Booking" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.helperText}>Unable to load booking details.</Text>
          <Text style={styles.helperText}>{errorMessage}</Text>
          <PrimaryButton label="Retry" onPress={() => setRetryKey((prev) => prev + 1)} />
        </View>
      </Screen>
    );
  }

  if (!venue) {
    return (
      <Screen>
        <TopBar title="Booking" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.helperText}>Venue not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title={`Booking (${currentStep}/${TOTAL_STEPS})`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.container}>
        {currentStep === 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Duration</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {durations.map((duration) => (
                <Chip
                  key={duration.id}
                  label={`${duration.minutes} min`}
                  selected={selectedDuration?.id === duration.id}
                  onPress={() => setSelectedDuration(duration)}
                />
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {getNextDates().map((date) => {
                const formatted = formatDate(date);
                return (
                  <Chip
                    key={formatted}
                    label={`${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`}
                    selected={selectedDate === formatted}
                    onPress={() => handleSelectDate(date)}
                  />
                );
              })}
              <Chip label="Pick date" onPress={() => setShowDatePicker(true)} />
            </ScrollView>
            {showDatePicker ? (
              <DateTimePicker
                value={selectedDate ? new Date(selectedDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, picked) => {
                  setShowDatePicker(false);
                  if (picked) handleSelectDate(picked);
                }}
              />
            ) : null}

            <Text style={styles.sectionTitle}>Start time</Text>
            {!selectedDate || !selectedDuration ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.helperText}>Select a date to see available slots.</Text>
              </Card>
            ) : slotsLoading ? (
              <View style={styles.row}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`slot-skeleton-${index}`} height={64} width={110} radius={16} />
                ))}
              </View>
            ) : slotsError ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.helperText}>{slotsError}</Text>
                <PrimaryButton label="Retry" onPress={() => setSlotsRetryKey((prev) => prev + 1)} />
              </Card>
            ) : slots.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.helperText}>No slots available for this date.</Text>
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {slots.map((slot) => (
                  <Pressable key={`${slot.start_time}-${slot.end_time}`} onPress={() => setSelectedSlot(slot)}>
                    <Card style={[styles.slotCard, selectedSlot?.start_time === slot.start_time && styles.slotCardActive]}>
                      <Text style={styles.slotText}>{formatTime(slot.start_time)}</Text>
                      <Text style={styles.slotSubtext}>{formatTime(slot.end_time)}</Text>
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <Text style={styles.sectionTitle}>Players</Text>
            <View style={styles.playersRow}>
              <Chip label="-" onPress={() => setPlayers((prev) => Math.max(minPlayers, prev - 1))} />
              <Text style={styles.playersValue}>{players}</Text>
              <Chip label="+" onPress={() => setPlayers((prev) => Math.min(maxPlayers, prev + 1))} />
            </View>
            <Text style={styles.playersHelper}>
              Min {minPlayers} · Max {maxPlayers}
            </Text>
          </View>
        ) : null}

        {currentStep === 2 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.paymentRow}>
              {venue.academy_profile?.allow_cash ? (
                <Pressable onPress={() => setPaymentType('cash')}>
                  <Card style={[styles.paymentCard, paymentType === 'cash' && styles.paymentCardActive]}>
                    <Text style={styles.paymentTitle}>Cash</Text>
                    <Text style={styles.paymentSubtitle}>Pay at venue</Text>
                  </Card>
                </Pressable>
              ) : null}
              {venue.academy_profile?.allow_cliq ? (
                <Pressable onPress={() => setPaymentType('cliq')}>
                  <Card style={[styles.paymentCard, paymentType === 'cliq' && styles.paymentCardActive]}>
                    <Text style={styles.paymentTitle}>CliQ</Text>
                    <Text style={styles.paymentSubtitle}>Transfer & upload receipt</Text>
                  </Card>
                </Pressable>
              ) : null}
            </View>

            {paymentType === 'cash' && venue.academy_profile?.allow_cash_on_date ? (
              <Pressable onPress={() => setCashOnDate((prev) => !prev)}>
                <Card style={styles.toggleCard}>
                  <Text style={styles.toggleText}>
                    Cash on date {cashOnDate ? 'enabled' : 'disabled'}
                  </Text>
                </Card>
              </Pressable>
            ) : null}

            {paymentType === 'cliq' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upload CliQ receipt</Text>
                {cliqImage ? (
                  <Image source={{ uri: cliqImage.uri }} style={styles.previewImage} />
                ) : (
                  <Card style={styles.uploadCard}>
                    <Text style={styles.uploadText}>No image selected</Text>
                  </Card>
                )}
                <PrimaryButton label={cliqImage ? 'Change image' : 'Upload image'} onPress={handlePickCliqImage} />
              </View>
            ) : null}
          </View>
        ) : null}

        {currentStep === 3 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guest details</Text>
            <TextField placeholder="First name" value={firstName} onChangeText={setFirstName} />
            <TextField placeholder="Last name" value={lastName} onChangeText={setLastName} />
            <TextField placeholder="Phone number" value={phone} onChangeText={setPhone} />
            <Text style={styles.helperText}>We will create a guest profile for this booking.</Text>
          </View>
        ) : null}
      </ScrollView>

      <StickyCTA
        label={currentStep === TOTAL_STEPS ? 'Proceed' : 'Continue'}
        priceLabel="Total"
        priceValue={priceValue}
        onPress={handleContinue}
        disabled={isPrimaryDisabled}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
  },
  row: {
    gap: spacing.sm,
  },
  slotCard: {
    padding: spacing.md,
    minWidth: 100,
    alignItems: 'center',
  },
  slotCardActive: {
    borderColor: '#F97316',
  },
  slotText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '600',
  },
  slotSubtext: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: '#64748B',
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playersValue: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '600',
  },
  playersHelper: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: '#64748B',
  },
  paymentRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  paymentCard: {
    width: 160,
    gap: spacing.xs,
  },
  paymentCardActive: {
    borderColor: '#F97316',
  },
  paymentTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
  },
  paymentSubtitle: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: '#64748B',
  },
  toggleCard: {
    padding: spacing.md,
  },
  toggleText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  uploadCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  uploadText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: '#64748B',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  helperText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: '#64748B',
  },
  emptyCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
});
