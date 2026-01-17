import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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

const normalizePhoneDigits = (raw) => String(raw || '').replace(/[^\d]/g, '');

const validatePhoneRealtime = (raw) => {
  const v = String(raw || '');
  const digits = normalizePhoneDigits(v);

  if (!v.trim()) {
    return { ok: false, soft: true, message: 'Enter your phone number to continue.' };
  }

  const hasLetters = /[A-Za-z]/.test(v);
  if (hasLetters) {
    return { ok: false, soft: false, message: 'Phone number must contain digits only.' };
  }

  if (digits.length < 9 || digits.length > 15) {
    return { ok: false, soft: false, message: 'Phone number must be between 9 and 15 digits.' };
  }

  return { ok: true };
};

const getAuthErrorMessage = (data) => {
  const raw = data?.error || data?.detail || data?.message || '';
  const s = String(raw).toLowerCase();

  const looksLikeInvalidCreds =
    s.includes('invalid phone') ||
    s.includes('invalid password') ||
    s.includes('phone or password') ||
    s.includes('invalid credentials') ||
    s.includes('incorrect') ||
    s.includes('not match');

  if (looksLikeInvalidCreds) return 'Invalid phone or password.';
  return raw || 'Something went wrong. Please try again.';
};

export function PlaygroundsAuthScreen() {
  const playgrounds = usePlaygroundsStore();
  const router = useRouter();

  const [mode, setMode] = useState('login'); // login | register
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // login
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const loginPhoneHint = useMemo(() => {
    const res = validatePhoneRealtime(loginPhone);
    return res.ok ? null : res;
  }, [loginPhone]);

  // register
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regGender, setRegGender] = useState(''); // optional
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const regPhoneHint = useMemo(() => {
    const res = validatePhoneRealtime(regPhone);
    return res.ok ? null : res;
  }, [regPhone]);

  // reset password panel (2 steps)
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const resetPhoneHint = useMemo(() => {
    const res = validatePhoneRealtime(resetPhone);
    return res.ok ? null : res;
  }, [resetPhone]);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setResetOpen(false);
    setResetStep(1);
  };

  const openReset = () => {
    setError(null);
    setResetOpen(true);
    setResetStep(1);
    setResetPhone(loginPhone || resetPhone);
  };

  const handleLogin = async () => {
    setError(null);

    if (!loginPhone.trim() || !loginPassword.trim()) {
      setError('Please enter your phone and password.');
      return;
    }

    const phoneRes = validatePhoneRealtime(loginPhone);
    if (!phoneRes.ok && !phoneRes.soft) {
      setError(phoneRes.message);
      return;
    }

    setLoading(true);
    const res = await playgrounds?.loginPublicUser?.({
      phone: loginPhone.trim(),
      password: loginPassword,
    });

    setLoading(false);

    if (!res?.success) {
      setError(getAuthErrorMessage(res?.error));
      return;
    }

    goToHome(router);
  };

  const handleRegister = async () => {
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    if (!regPhone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    const phoneRes = validatePhoneRealtime(regPhone);
    if (!phoneRes.ok && !phoneRes.soft) {
      setError(phoneRes.message);
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await playgrounds.registerPublicUser({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: regPhone.trim(),
      email: regEmail.trim() || null,
      gender: regGender || null,
      password: regPassword,
    });
    setLoading(false);
    
    if (!res?.success) {
      setError(getAuthErrorMessage(res?.error));
      return;
    }

    goToHome(router);
  };

  const handleResetRequest = async () => {
    setError(null);

    const phone = resetPhone.trim();
    if (!phone) {
      setError('Please enter your phone number.');
      return;
    }
    const phoneRes = validatePhoneRealtime(phone);
    if (!phoneRes.ok && !phoneRes.soft) {
      setError(phoneRes.message);
      return;
    }

    setResetLoading(true);
    const res = await playgrounds?.resetPasswordRequest?.({ phone });
    setResetLoading(false);

    if (!res?.success || res?.data?.error) {
      setError(res?.data?.error || 'Unable to send reset code. Please try again.');
      return;
    }

    setResetStep(2);
  };

  const handleResetConfirm = async () => {
    setError(null);

    if (!resetPhone.trim() || !resetCode.trim() || !resetNewPass || !resetConfirmPass) {
      setError('Please fill all reset fields.');
      return;
    }
    if (resetNewPass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (resetNewPass !== resetConfirmPass) {
      setError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    const res = await playgrounds?.resetPasswordConfirm?.({
      phone: resetPhone.trim(),
      reset_code: resetCode.trim(),
      new_password: resetNewPass,
    });
    setResetLoading(false);

    if (!res?.success || res?.data?.error) {
      setError(res?.data?.error || 'Unable to reset password. Please check the code and try again.');
      return;
    }

    // back to login and prefill phone
    setResetOpen(false);
    setResetStep(1);
    setLoginPhone(resetPhone.trim());
  };

  const canLogin = useMemo(() => loginPhone.trim().length >= 3 && loginPassword.length >= 1, [loginPhone, loginPassword]);
  const canRegister = useMemo(() => firstName.trim() && lastName.trim() && regPhone.trim(), [firstName, lastName, regPhone]);

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#F8FAFF', '#FFFFFF']} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={{ flex: 1 }}
        >
          <Text style={styles.title}>Welcome to SporHive Playgrounds</Text>
          <Text style={styles.subtitle}>Sign in or create an account to manage your bookings.</Text>

          <View style={styles.card}>
            {/* tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => switchMode('login')}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'register' && styles.tabActive]}
                onPress={() => switchMode('register')}
              >
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Sign up</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {mode === 'login' ? (
              <>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  value={loginPhone}
                  onChangeText={setLoginPhone}
                  placeholder="+962 7XX XXX XXX"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                <Text style={[styles.hint, loginPhoneHint?.soft ? styles.hintSoft : styles.hintError]}>
                  {loginPhoneHint ? loginPhoneHint.message : 'Tip: include country code if needed (e.g., +962…).'}
                </Text>

                <View style={styles.rowBetween}>
                  <Text style={styles.label}>Password</Text>
                  <TouchableOpacity onPress={openReset}>
                    <Text style={styles.link}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  style={styles.input}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, (!canLogin || loading) && styles.btnDisabled]}
                  disabled={!canLogin || loading}
                  onPress={handleLogin}
                >
                  <Text style={styles.primaryBtnText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
                </TouchableOpacity>

                {/* reset panel */}
                {resetOpen ? (
                  <View style={styles.resetPanel}>
                    <Text style={styles.resetTitle}>Reset your password</Text>

                    {resetStep === 1 ? (
                      <>
                        <Text style={styles.labelSmall}>Phone</Text>
                        <TextInput
                          value={resetPhone}
                          onChangeText={setResetPhone}
                          placeholder="+962…"
                          keyboardType="phone-pad"
                          style={styles.inputSmall}
                        />
                        <Text style={[styles.hint, resetPhoneHint?.soft ? styles.hintSoft : styles.hintError]}>
                          {resetPhoneHint ? resetPhoneHint.message : 'Tip: include country code if needed (e.g., +962…).'}
                        </Text>

                        <TouchableOpacity
                          style={[styles.secondaryBtn, resetLoading && styles.btnDisabled]}
                          disabled={resetLoading}
                          onPress={handleResetRequest}
                        >
                          <Text style={styles.secondaryBtnText}>
                            {resetLoading ? 'Sending…' : 'Send reset code'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <View style={styles.grid2}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.labelSmall}>Reset code</Text>
                            <TextInput
                              value={resetCode}
                              onChangeText={setResetCode}
                              placeholder="1234"
                              keyboardType="number-pad"
                              style={styles.inputSmall}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.labelSmall}>New password</Text>
                            <TextInput
                              value={resetNewPass}
                              onChangeText={setResetNewPass}
                              placeholder="******"
                              secureTextEntry
                              style={styles.inputSmall}
                            />
                          </View>
                        </View>

                        <Text style={styles.labelSmall}>Confirm password</Text>
                        <TextInput
                          value={resetConfirmPass}
                          onChangeText={setResetConfirmPass}
                          placeholder="******"
                          secureTextEntry
                          style={styles.inputSmall}
                        />

                        <TouchableOpacity
                          style={[styles.secondaryBtn, resetLoading && styles.btnDisabled]}
                          disabled={resetLoading}
                          onPress={handleResetConfirm}
                        >
                          <Text style={styles.secondaryBtnText}>
                            {resetLoading ? 'Updating…' : 'Update password'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity
                      onPress={() => {
                        setResetOpen(false);
                        setResetStep(1);
                      }}
                      style={{ marginTop: 10 }}
                    >
                      <Text style={styles.linkMuted}>Close</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.grid2}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>First name</Text>
                    <TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" style={styles.input} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Last name</Text>
                    <TextInput value={lastName} onChangeText={setLastName} placeholder="Last name" style={styles.input} />
                  </View>
                </View>

                <Text style={styles.label}>Phone</Text>
                <TextInput
                  value={regPhone}
                  onChangeText={setRegPhone}
                  placeholder="+962 7XX XXX XXX"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                <Text style={[styles.hint, regPhoneHint?.soft ? styles.hintSoft : styles.hintError]}>
                  {regPhoneHint ? regPhoneHint.message : 'Tip: include country code if needed (e.g., +962…).'}
                </Text>

                <Text style={styles.label}>Email (optional)</Text>
                <TextInput
                  value={regEmail}
                  onChangeText={setRegEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  style={styles.input}
                />

                <Text style={styles.label}>Gender (optional)</Text>
                <TextInput
                  value={regGender}
                  onChangeText={setRegGender}
                  placeholder="male / female"
                  style={styles.input}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput value={regPassword} onChangeText={setRegPassword} placeholder="Create a password" secureTextEntry style={styles.input} />

                <Text style={styles.label}>Confirm password</Text>
                <TextInput value={regConfirm} onChangeText={setRegConfirm} placeholder="Re-enter password" secureTextEntry style={styles.input} />

                <TouchableOpacity
                  style={[styles.primaryBtn, (!canRegister || loading) && styles.btnDisabled]}
                  disabled={!canRegister || loading}
                  onPress={handleRegister}
                >
                  <Text style={styles.primaryBtnText}>{loading ? 'Creating account…' : 'Create account'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* No guest mode (removed) */}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#11223A', marginTop: 12 },
  subtitle: { fontSize: 13, color: '#6C7A92', marginTop: 8 },

  card: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1A33',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FB',
    borderRadius: 16,
    padding: 6,
    marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#6C7A92' },
  tabTextActive: { color: '#11223A' },

  label: { fontSize: 12, fontWeight: '700', color: '#44516C', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E6F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
  },

  hint: { marginTop: -6, marginBottom: 10, fontSize: 12 },
  hintSoft: { color: '#6C7A92' },
  hintError: { color: '#C2410C' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontSize: 12, fontWeight: '700', color: '#F97316' },
  linkMuted: { fontSize: 12, fontWeight: '700', color: '#6C7A92' },

  primaryBtn: { backgroundColor: '#F97316', borderRadius: 16, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800' },
  secondaryBtn: { backgroundColor: '#111827', borderRadius: 14, paddingVertical: 11, alignItems: 'center', marginTop: 8 },
  secondaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  btnDisabled: { opacity: 0.6 },

  errorBox: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderWidth: 1, padding: 10, borderRadius: 14, marginBottom: 10 },
  errorText: { color: '#9F1239', fontSize: 12, fontWeight: '700' },

  resetPanel: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  resetTitle: { fontSize: 12, fontWeight: '900', color: '#7C2D12', marginBottom: 8 },

  labelSmall: { fontSize: 11, fontWeight: '800', color: '#44516C', marginBottom: 6 },
  inputSmall: { borderWidth: 1, borderColor: '#E0E6F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10, fontSize: 13, backgroundColor: '#FFFFFF' },

  grid2: { flexDirection: 'row', gap: 10 },
});
