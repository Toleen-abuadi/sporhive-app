import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { usePlaygroundsStore } from '../../services/playgrounds/playgrounds.store';
import { goToHome } from '../../navigation/playgrounds.routes';

export const PlaygroundsIdentifyScreen = () => {
  const playgrounds = usePlaygroundsStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const canSubmit = useMemo(() => email.length > 3 || phone.length > 6, [email, phone]);

  const handleIdentify = async () => {
    if (!canSubmit || !playgrounds?.identifyPublicUser) return;
    setLoading(true);
    const res = await playgrounds.identifyPublicUser({ email, phone });
    const nextStatus = res?.success ? 'success' : 'error';
    setStatus(nextStatus);
    setLoading(false);
    if (nextStatus === 'success') {
      goToHome(router);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#F8FAFF', '#FFFFFF']} style={styles.container}>
        <Text style={styles.title}>Welcome to Playgrounds</Text>
        <Text style={styles.subtitle}>
          Identify yourself to save bookings and get exclusive offers.
        </Text>
        <View style={styles.card}>
          <Text style={styles.helper}>
            Use email or phone. We will generate a unique public ID for your bookings.
          </Text>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            style={styles.input}
          />
          <Text style={styles.label}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+962"
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.button, (!canSubmit || loading) && styles.buttonDisabled]}
            onPress={handleIdentify}
            disabled={!canSubmit || loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
          </TouchableOpacity>
          {status ? (
            <Text style={styles.status}>
              {status === 'success' ? 'Profile saved.' : 'Unable to verify. Try again.'}
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#11223A',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6C7A92',
    marginTop: 8,
  },
  card: {
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1A33',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  helper: {
    fontSize: 12,
    color: '#6C7A92',
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#44516C',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E6F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#4F6AD7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  status: {
    marginTop: 12,
    fontSize: 12,
    color: '#4F6AD7',
  },
});
