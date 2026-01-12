import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import AcademyPicker from '../../components/portal/AcademyPicker';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';
import { portalApi } from '../../services/portal/portal.api';
import { usePortalAuth } from '../../services/portal/portal.store';

export default function PortalLoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, isAuthenticated } = usePortalAuth();
  const [academies, setAcademies] = useState([]);
  const [academyLoading, setAcademyLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let active = true;
    const loadAcademies = async () => {
      setAcademyLoading(true);
      const res = await portalApi.fetchActiveAcademies();
      const raw = res?.data || {};
      const customers = Array.isArray(raw.customers)
        ? raw.customers
        : Array.isArray(raw?.data?.customers)
          ? raw.data.customers
          : [];
      const items = customers.map((c) => ({
        id: Number(c.id),
        name: c.academy_name || c.name || c.label || 'Academy',
        subtitle: c.client_name || '',
        label: c.label || `${c.academy_name || ''} ${c.client_name || ''}`.trim(),
        searchText: `${c.academy_name || ''} ${c.client_name || ''} ${c.label || ''}`.toLowerCase(),
      }));
      if (active) {
        setAcademies(items);
        setSelectedId((prev) => prev ?? items[0]?.id ?? null);
      }
      setAcademyLoading(false);
    };

    loadAcademies();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/portal/(tabs)/home');
    }
  }, [isAuthenticated, router]);

  const isValid = useMemo(() => selectedId && username.trim() && password.trim(), [selectedId, username, password]);

  const handleLogin = async () => {
    setLocalError('');
    setSuccessMessage('');
    if (!isValid) {
      setLocalError('Please select an academy and enter your credentials.');
      return;
    }

    const result = await login({
      academyId: selectedId,
      username: username.trim(),
      password: password.trim(),
    });

    if (result?.success) {
      setSuccessMessage('Welcome back! Redirecting you to your portal...');
      router.replace('/portal/(tabs)/home');
      return;
    }

    setLocalError(result?.error || 'Login failed. Please try again.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="Welcome back" subtitle="Sign in to manage your training journey" />

        <AcademyPicker academies={academies} selectedId={selectedId} onSelect={(item) => setSelectedId(item.id)} />

        <PortalCard title="Player access" subtitle="Use your academy login credentials">
          {academyLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#5B5CF6" />
              <Text style={styles.loadingText}>Loading academies...</Text>
            </View>
          ) : null}

          {localError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{localError}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{String(error)}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              placeholder="Enter username"
              placeholderTextColor="#B3B1C6"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#B3B1C6"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryButton, (!isValid || isLoading) && styles.primaryButtonDisabled]}
            disabled={!isValid || isLoading}
            onPress={handleLogin}
          >
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Continue</Text>}
          </TouchableOpacity>
        </PortalCard>

        <Animated.View entering={FadeInUp.duration(500)} style={styles.helperRow}>
          <Text style={styles.helperText}>Forgot your password?</Text>
          <Text style={styles.helperLink} onPress={() => router.push('/portal/reset-password')}>
            Reset now
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F5FA',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#8D8CA1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EFEFFC',
    fontSize: 14,
    color: '#1B1B2D',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#8C8CA3',
  },
  errorBanner: {
    backgroundColor: '#FFECEC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFD0D0',
  },
  errorText: {
    fontSize: 12,
    color: '#C0392B',
  },
  successBanner: {
    backgroundColor: '#ECF9F1',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CDEEDB',
  },
  successText: {
    fontSize: 12,
    color: '#2E8B57',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#5B5CF6',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#5B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  helperText: {
    fontSize: 13,
    color: '#9A99AE',
  },
  helperLink: {
    fontSize: 13,
    color: '#5B5CF6',
    fontWeight: '600',
  },
});
