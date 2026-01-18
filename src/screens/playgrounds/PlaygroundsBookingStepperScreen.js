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

export const PlaygroundsBookingStepperScreen = () => {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);
  const { publicUserId } = usePlaygroundsAuth();
  const { data: venueData } = useVenue(venueId);
  const venue = venueData || {};
  const resolvedVenueId = Array.isArray(venueId) ? venueId[0] : venueId;

  const [durations, setDurations] = useState([]);
  const [durationsLoading, setDurationsLoading] = useState(false);
  const [venueDetails, setVenueDetails] = useState({});
  const datePills = useMemo(() => buildDatePills(7), []);

  const [step, setStep] = useState(0);
  const [duration, setDuration] = useState(null);
  const [date, setDate] = useState(datePills[0]?.value || '');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [players, setPlayers] = useState(2); // Default to 2 players
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

  // Fetch venue details and durations
  useEffect(() => {
    const fetchVenueAndDurations = async () => {
      if (!resolvedVenueId) return;

      try {
        // Fetch venue details
        const venueRes = await playgroundsStore.fetchVenueDetails(resolvedVenueId);
        if (venueRes?.success) {
          setVenueDetails(venueRes.data || {});
          // Set default players based on venue min_players
          const minPlayers = venueRes.data?.min_players || 2;
          setPlayers(minPlayers);
        }

        // Fetch durations for this venue
        setDurationsLoading(true);
        const durationsRes = await playgroundsStore.fetchVenueDurations(resolvedVenueId);
        if (durationsRes?.success && Array.isArray(durationsRes.data)) {
          const durationsList = durationsRes.data;
          setDurations(durationsList);
          
          // Set default duration
          if (durationsList.length > 0) {
            const defaultDuration = durationsList.find(d => d.is_default) || durationsList[0];
            setDuration(defaultDuration);
          }
        }
      } catch (err) {
        console.error('Error fetching venue data:', err);
        setError('Failed to load venue information');
      } finally {
        setDurationsLoading(false);
      }
    };

    fetchVenueAndDurations();
  }, [resolvedVenueId]);

  // Fetch slots when date or duration changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!duration?.minutes || !date || !resolvedVenueId) {
        setSlots([]);
        return;
      }

      setLoadingSlots(true);
      setError(null);
      
      try {
        const res = await playgroundsStore.fetchSlots(resolvedVenueId, {
          date,
          duration_minutes: duration.minutes,
        });
        
        if (res?.success) {
          setSlots(Array.isArray(res.data) ? res.data : []);
          // Clear selected slot when slots change
          setSelectedSlot(null);
        } else {
          setError('Unable to load slots. Please try another date.');
          setSlots([]);
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
        setError('Failed to load available slots');
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [date, duration, resolvedVenueId]);

  // Calculate total price
  useEffect(() => {
    if (duration?.base_price) {
      const basePrice = Number(duration.base_price);
      setTotalPrice(Number.isFinite(basePrice) ? basePrice : 0);
    } else {
      setTotalPrice(0);
    }
  }, [duration]);

  // Handle payment type changes
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

  // Helper function to fetch venue durations (add this to playgroundsStore if not exists)
  const fetchVenueDurations = async (venueId) => {
    try {
      // Using the correct endpoint from your backend
      const response = await fetch(`${BASE_URL}/api/v1/playgrounds/admin/venues/durations/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueId }),
      });
      
      const data = await response.json();
      if (response.ok && data.durations) {
        return { success: true, data: data.durations };
      }
      return { success: false, error: data.error || 'Failed to fetch durations' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

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
    if (!publicUserId) {
      setError('Please login to book a session');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        academy_profile_id: venueDetails?.academy_profile_id || venue?.academy_profile_id,
        user_id: publicUserId,
        activity_id: venueDetails?.activity_id || venue?.activity_id,
        venue_id: resolvedVenueId,
        duration_id: duration?.id,
        booking_date: date,
        start_time: selectedSlot?.start_time,
        number_of_players: Number(players),
        payment_type: paymentType === 'cash_payment_on_date' ? 'cash' : paymentType,
        cash_payment_on_date: cashOnDateFlag,
      };

      let res;
      
      if (paymentType === 'cliq' && cliqImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value != null) formData.append(key, String(value));
        });
        
        // Add CliQ image
        const filename = cliqFileName || 'cliq-receipt.jpg';
        const filetype = filename.match(/\.(jpg|jpeg|png)$/i) ? 'image/jpeg' : 'image/jpeg';
        
        formData.append('cliq_image', {
          uri: cliqImage,
          name: filename,
          type: filetype,
        });
        
        res = await playgroundsStore.createBooking(formData);
      } else {
        res = await playgrounds.createBooking(payload);
      }

      if (!res?.success) {
        setError(res?.error?.message || 'Booking failed. Please review your details.');
        return;
      }

      setSuccessBooking({
        id: res?.data?.id || res?.data?.booking_id || '0001',
        venue: venueDetails?.name || venue?.name || 'Playground',
        time: formatSlotLabel(selectedSlot),
        amount: `${totalPrice} JOD`,
        payment: paymentType,
        bookingCode: res?.data?.booking_code,
        bookingDate: date,
      });
      setStep(4);
    } catch (err) {
      console.error('Booking error:', err);
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

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.length) {
        setCliqImage(result.assets[0].uri);
        setCliqFileName(result.assets[0].fileName || 'cliq-receipt.jpg');
      }
    } catch (err) {
      console.error('Image picker error:', err);
      setError('Failed to upload image');
    }
  };

  const validationMessage = useMemo(() => {
    if (!showValidation) return null;
    if (step === 0) {
      if (!duration) return 'Select a duration to continue.';
      if (!date) return 'Select a date to continue.';
      if (!selectedSlot) return 'Select a time slot to continue.';
    }
    if (step === 1 && !players) return 'Enter the number of players.';
    if (step === 2 && !paymentType) return 'Choose a payment method.';
    if (step === 2 && paymentType === 'cliq' && !cliqImage) return 'Upload your CliQ receipt to continue.';
    return null;
  }, [showValidation, step, duration, date, selectedSlot, players, paymentType, cliqImage]);

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
          
          {durationsLoading ? (
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Loading durations...</Text>
          ) : durations.length === 0 ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>No durations available for this venue</Text>
          ) : (
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
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setDuration(option)}
                  >
                    <Text style={[styles.durationText, { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary }]}>
                      {option?.minutes ? `${option.minutes} min` : 'Duration'}
                    </Text>
                    <Text style={[styles.durationSubText, { color: isSelected ? '#FFFFFF' : theme.colors.textMuted }]}>
                      {option?.base_price ? `${option.base_price} JOD` : 'Price N/A'}
                    </Text>
                    {option.is_default && (
                      <Text style={[styles.defaultBadge, { color: isSelected ? '#FFFFFF' : theme.colors.primary }]}>
                        Popular
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginTop: 20 }]}>Select Date</Text>
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
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
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
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Available Time Slots</Text>
            {loadingSlots ? (
              <Text style={[styles.helper, { color: theme.colors.textMuted }]}>Loading slots...</Text>
            ) : null}
          </View>
          
          {slots.length === 0 && !loadingSlots ? (
            <Text style={[styles.noSlotsText, { color: theme.colors.textMuted }]}>
              No slots available for the selected date and duration
            </Text>
          ) : (
            <SlotGrid
              slots={slots}
              selectedSlotId={selectedSlot?.id || selectedSlot?.start_time}
              onSelect={setSelectedSlot}
            />
          )}
        </View>
      );
    }

    if (step === 1) {
      const minPlayers = venueDetails?.min_players || venue?.min_players || 1;
      const maxPlayers = venueDetails?.max_players || venue?.max_players || 20;
      
      return (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Number of Players</Text>
          
          <View style={[styles.playerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.stepperButton, { borderColor: theme.colors.border }]}
              onPress={() => setPlayers((prev) => Math.max(minPlayers, Number(prev) - 1))}
              disabled={players <= minPlayers}
            >
              <Text style={[styles.stepperText, { 
                color: players <= minPlayers ? theme.colors.textMuted : theme.colors.textPrimary 
              }]}>-</Text>
            </TouchableOpacity>
            
            <View style={styles.playerValueContainer}>
              <Text style={[styles.playerValue, { color: theme.colors.textPrimary }]}>{players}</Text>
              <Text style={[styles.playerLabel, { color: theme.colors.textMuted }]}>Players</Text>
            </View>
            
            <TouchableOpacity
              style={[styles.stepperButton, { borderColor: theme.colors.border }]}
              onPress={() => setPlayers((prev) => Math.min(maxPlayers, Number(prev) + 1))}
              disabled={players >= maxPlayers}
            >
              <Text style={[styles.stepperText, { 
                color: players >= maxPlayers ? theme.colors.textMuted : theme.colors.textPrimary 
              }]}>+</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.helper, { color: theme.colors.textMuted, marginTop: 8 }]}>
            Minimum: {minPlayers} players • Maximum: {maxPlayers} players
          </Text>
          
          <TextInput
            placeholder="Or enter number of players"
            keyboardType="number-pad"
            value={String(players)}
            onChangeText={(value) => {
              const numValue = parseInt(value.replace(/[^0-9]/g, '') || minPlayers);
              if (!isNaN(numValue)) {
                const clamped = Math.max(minPlayers, Math.min(maxPlayers, numValue));
                setPlayers(clamped);
              }
            }}
            style={[
              styles.input, 
              { 
                borderColor: theme.colors.border, 
                color: theme.colors.textPrimary,
                marginTop: 16,
              }
            ]}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>
      );
    }

    if (step === 2) {
      return (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Payment Method</Text>
          
          {paymentOptions.map((option) => {
            // Only show cash_payment_on_date if venue allows it
            if (option.id === 'cash_payment_on_date' && !venueDetails?.allow_cash_on_date) {
              return null;
            }
            
            return (
              <PaymentMethodCard
                key={option.id}
                title={option.title}
                subtitle={option.subtitle}
                selected={paymentType === option.id}
                onPress={() => setPaymentType(option.id)}
                disabled={
                  (option.id === 'cliq' && !venueDetails?.allow_cliq) ||
                  (option.id === 'cash' && !venueDetails?.allow_cash)
                }
              />
            );
          })}
          
          {paymentType === 'cliq' && venueDetails?.allow_cliq && (
            <>
              <CliqUploadCard
                uploading={false}
                onUpload={handleCliqUpload}
                fileName={cliqFileName}
                cliqName={venueDetails?.cliq_name}
                cliqNumber={venueDetails?.cliq_number}
              />
              
              {venueDetails?.cliq_name || venueDetails?.cliq_number ? (
                <View style={[styles.cliqInfo, { backgroundColor: theme.colors.primarySoft }]}>
                  <Text style={[styles.cliqInfoText, { color: theme.colors.textPrimary }]}>
                    Transfer to: {venueDetails.cliq_name || 'Academy Account'} ({venueDetails.cliq_number || 'N/A'})
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      );
    }

    if (step === 3) {
      return (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Review Your Booking</Text>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}>Booking Details</Text>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Venue:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {venueDetails?.name || venue?.name || 'Playground'}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Date:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {date ? new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Time:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {formatSlotLabel(selectedSlot)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Duration:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {duration?.minutes ? `${duration.minutes} minutes` : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Players:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {players} {players === 1 ? 'player' : 'players'}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Payment:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {paymentType === 'cash_payment_on_date' ? 'Cash on Date' : 
                 paymentType === 'cliq' ? 'CliQ Transfer' : 
                 paymentType.charAt(0).toUpperCase() + paymentType.slice(1)}
              </Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryTotalLabel, { color: theme.colors.textPrimary }]}>Total Amount:</Text>
              <Text style={[styles.summaryTotalValue, { color: theme.colors.primary }]}>
                {totalPrice.toFixed(2)} JOD
              </Text>
            </View>
          </View>
          
          <View style={[styles.noticeCard, { backgroundColor: theme.colors.primarySoft }]}>
            <Text style={[styles.noticeText, { color: theme.colors.textPrimary }]}>
              ⓘ Your booking will be confirmed once the academy approves it. You can cancel up to 24 hours before your booking time.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View>
        <SuccessReceiptSheet booking={successBooking} />
        
        <View style={styles.successButtons}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>Back to Venue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => goToMyBookings(router)}
          >
            <Text style={styles.primaryButtonText}>View My Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ctaLabel = step === 3 ? (submitting ? 'Submitting...' : 'Confirm Booking') : 'Continue';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <StepperHeader steps={steps} currentStep={step} />
          
          <Animated.View key={step} entering={FadeInRight} exiting={FadeOutLeft}>
            {renderStep()}
          </Animated.View>

          {validationMessage ? (
            <View style={[styles.validationContainer, { backgroundColor: theme.colors.error + '20' }]}>
              <Text style={[styles.validation, { color: theme.colors.error }]}>{validationMessage}</Text>
            </View>
          ) : null}
          
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            </View>
          ) : null}

          {step > 0 && step < steps.length - 1 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={[styles.backText, { color: theme.colors.primary }]}>← Back</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {step < steps.length - 1 ? (
          <StickyFooterCTA
            priceLabel="Total"
            priceValue={`${totalPrice.toFixed(2)} JOD`}
            buttonLabel={ctaLabel}
            onPress={step === 3 ? handleSubmit : handleNext}
            disabled={!canProceedStep || submitting}
            helperText={step === 0 && !selectedSlot ? 'Select a time slot to continue' : undefined}
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
    paddingBottom: 100, // Extra padding for sticky footer
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  durationSubText: {
    fontSize: 12,
    marginTop: 4,
  },
  defaultBadge: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dateRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  datePill: {
    width: 80,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
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
    paddingHorizontal: 16,
  },
  noSlotsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  input: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  playerCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 20,
    fontWeight: '700',
  },
  playerValueContainer: {
    alignItems: 'center',
  },
  playerValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  playerLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  cliqInfo: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  cliqInfoText: {
    fontSize: 12,
    textAlign: 'center',
  },
  summaryCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  noticeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  successButtons: {
    paddingHorizontal: 16,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  validationContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
  },
  validation: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    marginLeft: 16,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
});