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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goToMyBookings } from '../../navigation/playgrounds.routes';
import { playgroundsApi } from '../../services/playgrounds/playgrounds.api';
import { usePlaygroundsAuth } from '../../services/playgrounds/playgrounds.store';

const criteria = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'staff', label: 'Staff' },
  { key: 'quality', label: 'Quality' },
];

const RatingStars = ({ value, onChange }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} onPress={() => onChange(star)} style={styles.starChip}>
        <Text style={[styles.starText, value >= star && styles.starTextActive]}>{star}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export const PlaygroundsRatingScreen = () => {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const { publicUserId } = usePlaygroundsAuth();
  const [bookingOptions, setBookingOptions] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [overall, setOverall] = useState(0);
  const [criteriaScores, setCriteriaScores] = useState({});
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const resolvedToken = Array.isArray(token) ? token[0] : token;

  useEffect(() => {
    let active = true;
    const loadBookings = async () => {
      if (!publicUserId || resolvedToken) return;
      setLoading(true);
      const res = await playgroundsApi.listBookings({ user_id: publicUserId });
      if (!active) return;
      if (!res?.success) {
        setError('Unable to load bookings.');
      } else {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setBookingOptions(list.filter((booking) => booking?.can_rate || booking?.status === 'completed'));
      }
      setLoading(false);
    };
    loadBookings();
    return () => {
      active = false;
    };
  }, [publicUserId, resolvedToken]);

  useEffect(() => {
    let active = true;
    const resolveToken = async () => {
      if (!resolvedToken) return;
      setLoading(true);
      const resolved = await playgroundsApi.resolveRatingToken(resolvedToken);
      if (!active) return;
      if (!resolved?.success) {
        setError('Unable to resolve rating token.');
        setLoading(false);
        return;
      }
      const bookingId = resolved?.data?.booking_id || resolved?.data?.bookingId;
      const userId = resolved?.data?.user_id || publicUserId;
      const canRate = await playgroundsApi.canRate({ booking_id: bookingId, user_id: userId });
      if (!canRate?.success) {
        setError('Unable to verify rating eligibility.');
        setLoading(false);
        return;
      }
      if (!canRate?.data?.can_rate && !canRate?.data?.allowed) {
        setError('Rating already submitted or not allowed.');
        setLoading(false);
        return;
      }
      setSelectedBooking({ id: bookingId, user_id: userId });
      setLoading(false);
    };
    resolveToken();
    return () => {
      active = false;
    };
  }, [resolvedToken, publicUserId]);

  const handleCriteriaChange = (key, value) => {
    setCriteriaScores((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedBooking && !resolvedToken) {
      setError('Select a booking to rate.');
      return;
    }
    if (!overall) {
      setError('Select an overall rating.');
      return;
    }
    setLoading(true);
    setError(null);
    const payload = {
      booking_id: selectedBooking?.id || selectedBooking?.booking_id,
      user_id: selectedBooking?.user_id || publicUserId,
      overall,
      criteria_scores: criteriaScores,
      comment,
    };
    const res = await playgroundsApi.createRating(payload);
    if (!res?.success) {
      setError('Unable to submit rating.');
      setLoading(false);
      return;
    }
    setStatus('success');
    setLoading(false);
    setTimeout(() => goToMyBookings(router), 800);
  };

  const bookingLabel = useMemo(() => {
    if (!selectedBooking) return null;
    return selectedBooking?.venue_name || selectedBooking?.venue || `Booking #${selectedBooking?.id}`;
  }, [selectedBooking]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Rate Your Booking</Text>
        <Text style={styles.subtitle}>Share quick feedback to help us improve.</Text>

        {loading ? <Text style={styles.helper}>Loading...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {status === 'success' ? <Text style={styles.success}>Thanks for your feedback!</Text> : null}

        {!resolvedToken && bookingOptions.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Booking</Text>
            {bookingOptions.map((booking) => (
              <TouchableOpacity
                key={booking.id || booking.booking_id}
                style={[styles.bookingChip, selectedBooking?.id === booking.id && styles.bookingChipActive]}
                onPress={() => setSelectedBooking(booking)}
              >
                <Text style={[styles.bookingChipText, selectedBooking?.id === booking.id && styles.bookingChipTextActive]}>
                  {booking?.venue_name || booking?.venue || `Booking #${booking.id}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {bookingLabel ? <Text style={styles.selectedBooking}>Rating: {bookingLabel}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Rating</Text>
          <RatingStars value={overall} onChange={setOverall} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {criteria.map((item) => (
            <View key={item.key} style={styles.criteriaRow}>
              <Text style={styles.criteriaLabel}>{item.label}</Text>
              <RatingStars
                value={criteriaScores[item.key] || 0}
                onChange={(value) => handleCriteriaChange(item.key, value)}
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comments</Text>
          <TextInput
            placeholder="Share your experience"
            value={comment}
            onChangeText={setComment}
            style={styles.textArea}
            multiline
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Submitting...' : 'Submit Rating'}</Text>
        </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11223A',
  },
  subtitle: {
    fontSize: 12,
    color: '#6C7A92',
    marginTop: 6,
    marginBottom: 12,
  },
  helper: {
    fontSize: 12,
    color: '#6C7A92',
    marginBottom: 12,
  },
  error: {
    fontSize: 12,
    color: '#D64545',
    marginBottom: 12,
  },
  success: {
    fontSize: 12,
    color: '#2E7D32',
    marginBottom: 12,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11223A',
    marginBottom: 10,
  },
  bookingChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F4FA',
    marginBottom: 8,
  },
  bookingChipActive: {
    backgroundColor: '#4F6AD7',
  },
  bookingChipText: {
    fontSize: 12,
    color: '#6C7A92',
    fontWeight: '600',
  },
  bookingChipTextActive: {
    color: '#FFFFFF',
  },
  selectedBooking: {
    fontSize: 12,
    color: '#4F6AD7',
    marginTop: 8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    color: '#6C7A92',
    fontWeight: '600',
  },
  starTextActive: {
    color: '#4F6AD7',
  },
  criteriaRow: {
    marginBottom: 12,
  },
  criteriaLabel: {
    fontSize: 12,
    color: '#6C7A92',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E0E6F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: '#4F6AD7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
