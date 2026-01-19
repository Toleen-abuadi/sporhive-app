import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarDays,
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
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
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
import { borderRadius, shadows, spacing } from '../../theme/tokens';

function formatSlotLabel(slot) {
  const start = slot.start || slot.start_time || '';
  const end = slot.end || slot.end_time || '';
  if (!start && !end) return 'TBD';
  if (!end) return start;
  return `${start} - ${end}`;
}

function getDateLabel(date) {
  return date.toISOString().slice(0, 10);
}

function buildSlotsPayload({ venueId, date, durationMinutes }) {
  // backend expects YYYY-MM-DD (string) and requires it
  const normalizedDate = typeof date === 'string' ? date.trim() : '';
  return {
    venue_id: String(venueId),
    date: normalizedDate, // REQUIRED
    duration_minutes: Number(durationMinutes) || 60,
  };
}

function buildBookingDraft(venue, state) {
  if (!venue?.id || !venue?.academy_profile_id) return null;
  return {
    venueId: String(venue.id),
    academyProfileId: String(venue.academy_profile_id),
    draft: state,
  };
}

function formatMoney(amount, currency) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount)))
    return null;
  const normalizedCurrency = currency || 'AED';
  return `${normalizedCurrency} ${Number(amount).toFixed(0)}`;
}

export function BookingStepperScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();

  const [venue, setVenue] = useState(null);
  const [durations, setDurations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [players, setPlayers] = useState('2');
  const [paymentType, setPaymentType] = useState('cash');
  const [cashOnDate, setCashOnDate] = useState(true);
  const [cliqImage, setCliqImage] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [publicUser, setPublicUser] = useState(null);
  const [userMode, setUserMode] = useState('guest');
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestSheetOpen, setGuestSheetOpen] = useState(false);
  const [baseFilters, setBaseFilters] = useState(null);
  const toast = useToast();
  const minPlayers = venue?.min_players ?? 1;
  const maxPlayers = venue?.max_players ?? 20;
  const stepAnim = useRef(new Animated.Value(0)).current;

  const currency =
    venue?.currency || durations?.[0]?.currency || slots?.[0]?.currency || null;
  const durationMinutes =
    selectedDuration?.minutes || selectedDuration?.duration_minutes || 60;
  const basePrice = selectedDuration?.price || 0;
  const taxRate = 0.05;
  const taxAmount = basePrice ? basePrice * taxRate : 0;
  const totalAmount = basePrice + taxAmount;

  const draftPayload = useMemo(() => {
    return buildBookingDraft(venue, {
      selectedDurationId: selectedDuration?.id
        ? String(selectedDuration.id)
        : undefined,
      bookingDate: bookingDate || undefined,
      players: Number(players) || 2,
      selectedSlot: selectedSlot
        ? {
            start_time: String(
              selectedSlot.start_time || selectedSlot.start || ''
            ),
            end_time: String(selectedSlot.end_time || selectedSlot.end || ''),
          }
        : undefined,
      paymentType,
      cashOnDate,
      currentStep,
    });
  }, [
    bookingDate,
    cashOnDate,
    currentStep,
    paymentType,
    players,
    selectedDuration?.id,
    selectedSlot,
    venue,
  ]);

  const loadVenue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [client, draft, mode, user] = await Promise.all([
        getPlaygroundsClientState(),
        getBookingDraft(),
        getPublicUserMode(),
        getPublicUser(),
      ]);
      if (mode) setUserMode(mode);
      if (user) setPublicUser(user);

      const cached = Array.isArray(client?.cachedResults)
        ? client?.cachedResults
        : [];
      const fromCache = cached.find(
        (item) => String(item.id) === String(venueId)
      );
      if (fromCache) setVenue(fromCache);
      if (draft?.venueId && String(draft.venueId) === String(venueId)) {
        if (draft.draft.selectedDurationId) {
          setSelectedDuration(
            (prev) => prev || { id: draft.draft.selectedDurationId }
          );
        }
        if (draft.draft.bookingDate) setBookingDate(draft.draft.bookingDate);
        if (draft.draft.players) setPlayers(String(draft.draft.players));
        if (draft.draft.paymentType) setPaymentType(draft.draft.paymentType);
        if (typeof draft.draft.cashOnDate === 'boolean')
          setCashOnDate(draft.draft.cashOnDate);
        if (draft.draft.currentStep) setCurrentStep(draft.draft.currentStep);
        if (draft.draft.selectedSlot) {
          setSelectedSlot({
            start_time: draft.draft.selectedSlot.start_time,
            end_time: draft.draft.selectedSlot.end_time,
          });
        }
      } else {
        setBaseFilters({ date: bookingDate, players: Number(players) || 2 });
      }
    } catch (err) {
      setError(err?.message || 'Unable to load booking data.');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  const handleSelectDate = useCallback(
    (label) => {
      setBookingDate(label);
      setSelectedSlot(null);
      setSlots([]);
      // Call immediately with the selected date (no waiting for state)
      loadSlots(label);
    },
    [loadSlots]
  );

  useEffect(() => {
    if (baseFilters?.date) {
      setBookingDate((prev) => prev || baseFilters.date || '');
    }
    if (baseFilters?.players) {
      setPlayers((prev) => prev || String(baseFilters.players));
    }
  }, [baseFilters]);

  const loadDurations = useCallback(async () => {
    if (!venue?.id) return;
    try {
      const durationRes = await endpoints.playgrounds.venueDurations({
        venue_id: venue.id,
      });
      const list = Array.isArray(durationRes?.durations)
        ? durationRes.durations
        : Array.isArray(durationRes?.data?.durations)
        ? durationRes.data.durations
        : [];
      setDurations(list);
      const defaultDuration = list.find((item) => item.is_default) || list[0];
      if (!selectedDuration && defaultDuration) {
        setSelectedDuration(defaultDuration);
      }
    } catch (err) {
      setError(err?.message || 'Unable to load durations.');
    }
  }, [selectedDuration, venue?.id]);

  const loadSlots = useCallback(
    async (explicitDate) => {
      if (!venue?.id || !selectedDuration) return;

      const effectiveDate = (explicitDate ?? bookingDate ?? '').trim();
      if (!effectiveDate) {
        // Don’t call backend if date isn’t selected yet
        setSlots([]);
        setSelectedSlot(null);
        return;
      }

      setSlotLoading(true);
      setError('');

      try {
        const slotRes = await endpoints.playgrounds.slots(
          buildSlotsPayload({
            venueId: venue.id,
            date: effectiveDate, // ALWAYS send selected date
            durationMinutes,
          })
        );

        const list = Array.isArray(slotRes?.slots)
          ? slotRes.slots
          : Array.isArray(slotRes?.data?.slots)
          ? slotRes.data.slots
          : [];

        setSlots(list);
      } catch (err) {
        setSlots([]);
        setSelectedSlot(null);
        setError(err?.message || 'Unable to load slots.');
      } finally {
        setSlotLoading(false);
      }
    },
    [bookingDate, durationMinutes, selectedDuration, venue?.id]
  );

  useEffect(() => {
    loadVenue();
  }, [loadVenue]);

  useEffect(() => {
    loadDurations();
  }, [loadDurations]);

  useEffect(() => {
    if ((bookingDate || '').trim()) {
      loadSlots();
    }
  }, [bookingDate, loadSlots]);

  useEffect(() => {
    if (draftPayload) {
      setBookingDraft(draftPayload);
    }
  }, [draftPayload]);

  useEffect(() => {
    if ((bookingDate || '').trim() && selectedDuration) {
      setSelectedSlot(null);
      loadSlots();
    }
  }, [selectedDuration?.id, bookingDate, loadSlots]);

  useEffect(() => {
    setPublicUserMode(userMode);
  }, [userMode]);

  useEffect(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [currentStep, stepAnim]);

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
        await setBookingDraft({
          ...draftPayload,
          draft: { ...draftPayload.draft, currentStep },
        });
      }
      router.push('/playgrounds/auth?fromBooking=1');
      return;
    }
    let activeUser = publicUser;
    if (userMode === 'guest' && !activeUser?.id) {
      setGuestSheetOpen(true);
      return;
    }
    if (!activeUser?.id) {
      setError('Please sign in to complete booking.');
      return;
    }
    if (paymentType === 'cliq' && !cliqImage?.uri) {
      setError('Please upload your CliQ payment proof.');
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
    formData.append(
      'start_time',
      String(selectedSlot.start_time || selectedSlot.start || '')
    );
    formData.append('number_of_players', String(Number(players) || 2));
    formData.append('payment_type', paymentType);
    formData.append('cash_payment_on_date', cashOnDate ? 'true' : 'false');
    if (paymentType === 'cliq' && cliqImage?.uri) {
      formData.append('cliq_image', {
        uri: cliqImage.uri,
        name: cliqImage.fileName || 'cliq.jpg',
        type: cliqImage.mimeType || 'image/jpeg',
      });
    }

    try {
      setSubmitting(true);
      const res = await endpoints.playgrounds.createBooking(formData);
      await setBookingDraft(null);
      router.replace('/playgrounds/bookings');
      toast.success(
        res?.booking_code
          ? `Code ${res.booking_code}`
          : 'Your session is booked.',
        {
          title: 'Booking confirmed',
        }
      );
      if (res?.booking_code) {
        setError(`Booking confirmed: ${res.booking_code}`);
      }
    } catch (err) {
      setError(err?.message || 'Unable to complete booking.');
    } finally {
      setSubmitting(false);
    }
  }, [
    bookingDate,
    cashOnDate,
    cliqImage?.uri,
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
    toast,
    userMode,
    venue?.academy_profile_id,
    venue?.activity_id,
    venue?.id,
  ]);

  const handleGuestRegister = useCallback(async () => {
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
      await persistPublicUser(user);
      setPublicUser(user);
      setGuestSheetOpen(false);
    } catch (err) {
      setError(err?.message || 'Unable to register guest.');
    }
  }, [guestFirstName, guestLastName, guestPhone]);

  const handlePickCliqImage = useCallback(async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.[0]) {
      setCliqImage(res.assets[0]);
    }
  }, []);

  const handlePickCliqCamera = useCallback(async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.[0]) {
      setCliqImage(res.assets[0]);
    }
  }, []);

  return (
    <Screen safe>
      <View style={styles.stepperHeader}>
        <Text variant="bodySmall" color={colors.textSecondary}>
          Step {currentStep} of 3
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: colors.accentOrange,
                width: `${(currentStep / 3) * 100}%`,
              },
            ]}
          />
        </View>
      </View>
      {loading ? (
        <LoadingState message="Preparing your booking..." />
      ) : error ? (
        <ErrorState
          title="Booking issue"
          message={error}
          onAction={loadVenue}
        />
      ) : venue ? (
        <View style={styles.container}>
          <View style={styles.stepHeader}>
            <Text variant="bodySmall" weight="semibold">
              {venue.name || venue.title || 'Playground'}
            </Text>
            <Text variant="h4" weight="semibold">
              {currentStep === 1
                ? 'Choose duration'
                : currentStep === 2
                ? 'Pick a time'
                : 'Review & pay'}
            </Text>
          </View>

          {currentStep === 1 ? (
            <Animated.View style={[styles.stepSection, { opacity: stepAnim }]}>
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
              <View style={styles.playersStepper}>
                <Button
                  variant="secondary"
                  size="small"
                  onPress={() =>
                    setPlayers((prev) =>
                      String(Math.max(minPlayers, Number(prev || 2) - 1))
                    )
                  }
                  accessibilityLabel="Decrease players"
                >
                  -
                </Button>
                <Text variant="bodySmall" weight="semibold">
                  {players}
                </Text>
                <Button
                  variant="secondary"
                  size="small"
                  onPress={() =>
                    setPlayers((prev) =>
                      String(Math.min(maxPlayers, Number(prev || 2) + 1))
                    )
                  }
                  accessibilityLabel="Increase players"
                >
                  +
                </Button>
              </View>
              <View style={styles.durationCards}>
                {durations.length ? (
                  durations.map((duration) => {
                    const durationLabel =
                      duration.label ||
                      `${
                        duration.minutes || duration.duration_minutes || 60
                      } min`;
                    return (
                      <Pressable
                        key={String(duration.id ?? durationLabel)}
                        onPress={() => setSelectedDuration(duration)}
                        style={[
                          styles.durationCard,
                          {
                            borderColor:
                              selectedDuration?.id === duration.id
                                ? colors.accentOrange
                                : colors.border,
                            backgroundColor:
                              selectedDuration?.id === duration.id
                                ? colors.surfaceElevated
                                : colors.surface,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${durationLabel}`}
                      >
                        <Text variant="bodySmall" weight="semibold">
                          {durationLabel}
                        </Text>
                        <Text variant="bodySmall" color={colors.textSecondary}>
                          {formatMoney(
                            duration.price,
                            duration.currency || currency
                          ) || 'Price TBD'}
                        </Text>
                      </Pressable>
                    );
                  })
                ) : (
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    No durations listed.
                  </Text>
                )}
              </View>
            </Animated.View>
          ) : null}

          {currentStep === 2 ? (
            <Animated.View style={[styles.stepSection, { opacity: stepAnim }]}>
              <View style={styles.dateStrip}>
                {Array.from({ length: 6 }).map((_, index) => {
                  const date = new Date();
                  date.setDate(date.getDate() + index);
                  const label = getDateLabel(date);
                  return (
                    <Chip
                      key={label}
                      label={label}
                      selected={bookingDate === label}
                      onPress={() => handleSelectDate(label)}
                      accessibilityLabel={`Select ${label}`}
                    />
                  );
                })}
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
                          : formatSlotLabel(selectedSlot || {}) ===
                            formatSlotLabel(item)
                      }
                      icon={
                        item.start_time &&
                        Number(item.start_time.split(':')[0]) >= 18 ? (
                          <Moon size={12} color={colors.textMuted} />
                        ) : (
                          <Sun size={12} color={colors.textMuted} />
                        )
                      }
                      onPress={() => setSelectedSlot(item)}
                    />
                  )}
                />
              ) : (
                <EmptyState
                  title="No slots"
                  message="Try another date or adjust the duration."
                />
              )}
              {!slots.length ? (
                <View style={styles.altSuggestions}>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    Suggestions: change duration or pick another date.
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          ) : null}

          {currentStep === 3 ? (
            <Animated.View style={[styles.stepSection, { opacity: stepAnim }]}>
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
                <Chip
                  label="Cash"
                  selected={paymentType === 'cash'}
                  onPress={() => setPaymentType('cash')}
                />
                <Chip
                  label="CliQ"
                  selected={paymentType === 'cliq'}
                  onPress={() => setPaymentType('cliq')}
                />
              </View>
              {paymentType === 'cliq' ? (
                <View style={styles.cliqSection}>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    Upload CliQ payment proof.
                  </Text>
                  <View style={styles.cliqButtons}>
                    <Button
                      variant="secondary"
                      size="small"
                      onPress={handlePickCliqCamera}
                    >
                      Camera
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onPress={handlePickCliqImage}
                    >
                      Library
                    </Button>
                  </View>
                  {cliqImage?.uri ? (
                    <Image
                      source={{ uri: cliqImage.uri }}
                      style={styles.cliqPreview}
                    />
                  ) : null}
                </View>
              ) : null}
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
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Summary
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {bookingDate || 'Date'} •{' '}
                  {selectedDuration?.label || `${durationMinutes} min`}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {selectedSlot
                    ? formatSlotLabel(selectedSlot)
                    : 'Select a slot'}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Players: {players}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Tax (5%): {formatMoney(taxAmount, currency) || '--'}
                </Text>
                <Text variant="h4" weight="bold">
                  {formatMoney(totalAmount, currency) || '--'}
                </Text>
                <Input
                  label="Promo code"
                  placeholder="Enter code"
                  accessibilityLabel="Promo code"
                />
              </View>
            </Animated.View>
          ) : null}

          <View style={styles.stickyFooter}>
            <View>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Total
              </Text>
              <Text variant="bodySmall" weight="semibold">
                {formatMoney(totalAmount, currency) || '--'}
              </Text>
            </View>
            <View style={styles.footerButtons}>
              <Button
                variant="secondary"
                onPress={handleBack}
                disabled={currentStep === 1}
              >
                Back
              </Button>
              {currentStep < 3 ? (
                <Button
                  onPress={handleNext}
                  disabled={
                    (currentStep === 1 && !selectedDuration) ||
                    (currentStep === 2 && !selectedSlot)
                  }
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onPress={handleBook}
                  loading={submitting}
                  disabled={userMode === 'registered' && !publicUser?.id}
                >
                  Confirm booking
                </Button>
              )}
            </View>
          </View>
        </View>
      ) : null}

      <BottomSheetModal
        visible={guestSheetOpen}
        onClose={() => setGuestSheetOpen(false)}
      >
        <View style={styles.guestSheet}>
          <Text variant="h4" weight="semibold">
            Continue as guest
          </Text>
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
            accessibilityLabel="Guest phone"
          />
          <View style={styles.guestActions}>
            <Button
              variant="secondary"
              onPress={() => router.push('/playgrounds/auth?fromBooking=1')}
            >
              Sign in
            </Button>
            <Button onPress={handleGuestRegister}>Continue</Button>
          </View>
        </View>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  stepperHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.full,
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
  durationCards: {
    gap: spacing.sm,
  },
  durationCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  dateStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  playersStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  altSuggestions: {
    marginTop: spacing.sm,
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
  cliqSection: {
    gap: spacing.sm,
  },
  cliqButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cliqPreview: {
    height: 120,
    borderRadius: borderRadius.lg,
  },
  guestForm: {
    gap: spacing.sm,
  },
  stickyFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  guestSheet: {
    gap: spacing.md,
  },
  guestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
