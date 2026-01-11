// src/screens/portal/LoginScreen.js
import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useI18n } from '../../services/i18n/i18n';
import { usePortal } from '../../services/portal/portal.store';
import { useAcademies } from '../../services/portal/portal.hooks';
import { colors, spacing, radius, typography, shadows, alphaBg } from '../../theme/portal.styles';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function LoginScreen() {
  const { t } = useI18n();
  const { login, isLoading, error, academyId: storedAcademyId, setAcademyId } = usePortal();
  const { academies, loading: academiesLoading, searchQuery, setSearchQuery } = useAcademies();

  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAcademyPicker, setShowAcademyPicker] = useState(false);
  const [localError, setLocalError] = useState(null);
  const router = useRouter();

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (storedAcademyId && academies.length > 0 && !selectedAcademy) {
      const found = academies.find((a) => a.id === Number(storedAcademyId));
      if (found) setSelectedAcademy(found);
    }
  }, [storedAcademyId, academies, selectedAcademy]);

  const validateForm = useCallback(() => {
    if (!selectedAcademy) return { valid: false, message: t('portal.login.error.selectAcademy', 'Select academy') };
    if (!username.trim()) return { valid: false, message: t('portal.login.error.enterUsername', 'Enter username') };
    if (!password.trim()) return { valid: false, message: t('portal.login.error.enterPassword', 'Enter password') };
    return { valid: true };
  }, [selectedAcademy, username, password, t]);

  const handleAcademySelect = useCallback(
    async (academy) => {
      setSelectedAcademy(academy);
      setShowAcademyPicker(false);
      setSearchQuery('');
      // Persist academy early (enables reset flow even before login)
      await setAcademyId?.(academy.id);
    },
    [setAcademyId, setSearchQuery]
  );

  const handleLogin = useCallback(async () => {
    const validation = validateForm();
    if (!validation.valid) {
      setLocalError(validation.message);
      return;
    }

    setLocalError(null);

    // Ensure academy persisted
    await setAcademyId?.(selectedAcademy.id);

    const result = await login({
      academyId: selectedAcademy.id,
      username: username.trim(),
      password: password.trim(),
    });

    if (!result.success) {
      setLocalError(result.error || t('portal.login.error.invalidCredentials', 'Invalid credentials'));
      return;
    }
    
      router.replace('/(portal)/overview');
  }, [validateForm, setAcademyId, selectedAcademy, login, username, password, t, router]);

  const renderAcademyItem = useCallback(
    ({ item }) => (
      <AnimatedPressable
        entering={FadeInDown}
        onPress={() => handleAcademySelect(item)}
        style={({ pressed }) => [
          styles.academyItem,
          pressed && styles.academyItemPressed,
          selectedAcademy?.id === item.id && styles.academyItemSelected,
        ]}
      >
        <View style={styles.academyItemContent}>
          <Text style={styles.academyItemName} numberOfLines={1}>
            {item.academy_name || item.name || 'Academy'}
          </Text>
          {!!(item.client_name || item.subtitle) && (
            <Text style={styles.academyItemLocation} numberOfLines={1}>
              {item.client_name || item.subtitle}
            </Text>
          )}
        </View>
        {selectedAcademy?.id === item.id && <Feather name="check" size={18} color={colors.primary} />}
      </AnimatedPressable>
    ),
    [handleAcademySelect, selectedAcademy]
  );

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <View style={styles.content}>
        <Animated.View entering={SlideInUp.duration(400)} style={styles.header}>
          <Text style={styles.title}>{t('portal.login.title', 'Player Portal')}</Text>
          <Text style={styles.subtitle}>{t('portal.login.subtitle', 'Sign in to access your dashboard')}</Text>
        </Animated.View>

        <View style={styles.pickerSection}>
          <Text style={styles.fieldLabel}>{t('portal.login.selectAcademy', 'Select Academy')}</Text>

          <Pressable
            onPress={() => {
              setShowAcademyPicker((v) => !v);
              if (!showAcademyPicker) setTimeout(() => searchInputRef.current?.focus(), 120);
            }}
            style={styles.pickerButton}
          >
            {selectedAcademy ? (
              <View style={styles.pickerButtonContent}>
                <Text style={styles.pickerButtonText} numberOfLines={1}>
                  {selectedAcademy.label || selectedAcademy.academy_name}
                </Text>
                <Feather name="chevron-down" size={18} color={colors.textSecondary} />
              </View>
            ) : (
              <Text style={styles.pickerButtonPlaceholder}>
                {t('portal.login.selectAcademyPlaceholder', 'Tap to choose your academy')}
              </Text>
            )}
          </Pressable>
        </View>

        {showAcademyPicker && (
          <Animated.View entering={FadeInDown} style={styles.pickerDropdown}>
            <View style={styles.searchContainer}>
              <Feather name="search" size={16} color={colors.textTertiary} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder={t('portal.login.searchAcademies', 'Search academies...')}
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Feather name="x" size={16} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {academiesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
              </View>
            ) : academies.length > 0 ? (
              <FlatList
                data={academies}
                keyExtractor={(item) => `academy-${item.id}`}
                renderItem={renderAcademyItem}
                style={styles.academyList}
                contentContainerStyle={styles.academyListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Feather name="search" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyText}>{t('portal.login.noResults', 'No academies found')}</Text>
              </View>
            )}
          </Animated.View>
        )}

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>{t('portal.login.username', 'Username')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('portal.login.usernamePlaceholder', 'Enter your username')}
              placeholderTextColor={colors.textTertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>{t('portal.login.password', 'Password')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('portal.login.passwordPlaceholder', 'Enter your password')}
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {!!displayError && (
            <Animated.View entering={FadeInDown} style={styles.errorBanner}>
              <Feather name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{String(displayError)}</Text>
            </Animated.View>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
              isLoading && styles.loginButtonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textInverted} />
            ) : (
              <>
                <Feather name="log-in" size={18} color={colors.textInverted} style={{ marginRight: 8 }} />
                <Text style={styles.loginButtonText}>{t('portal.login.signIn', 'Sign In')}</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/portal/reset-password')} style={styles.forgotPasswordLink}>
            <Text style={styles.forgotPasswordText}>{t('portal.login.forgotPassword', 'Forgot your password?')}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundDark },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: { marginBottom: spacing.xl, alignItems: 'center' },
  title: {
    fontSize: typography.sizes['3xl'],
    fontFamily: typography.family.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: { fontSize: typography.sizes.base, fontFamily: typography.family.regular, color: colors.textSecondary },

  pickerSection: { marginBottom: spacing.md },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.family.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  pickerButton: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
    justifyContent: 'center',
  },
  pickerButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerButtonText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.family.medium,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  pickerButtonPlaceholder: { fontSize: typography.sizes.base, fontFamily: typography.family.regular, color: colors.textTertiary },

  pickerDropdown: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    marginBottom: spacing.md,
    maxHeight: 280,
    ...shadows.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    margin: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    fontFamily: typography.family.regular,
    color: colors.textPrimary,
  },

  loadingContainer: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { fontSize: typography.sizes.sm, fontFamily: typography.family.regular, color: colors.textSecondary },

  academyList: { maxHeight: 200 },
  academyListContent: { padding: spacing.sm },
  academyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  academyItemPressed: { opacity: 0.8 },
  academyItemSelected: { backgroundColor: alphaBg(colors.primary, 0.1), borderColor: colors.primary },
  academyItemContent: { flex: 1, marginRight: spacing.sm },
  academyItemName: { fontSize: typography.sizes.base, fontFamily: typography.family.medium, color: colors.textPrimary },
  academyItemLocation: { fontSize: typography.sizes.sm, fontFamily: typography.family.regular, color: colors.textSecondary, marginTop: 2 },
  emptyContainer: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { fontSize: typography.sizes.sm, fontFamily: typography.family.regular, color: colors.textSecondary, textAlign: 'center' },

  formSection: { flex: 1 },
  inputGroup: { marginBottom: spacing.md },
  textInput: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
    fontSize: typography.sizes.base,
    fontFamily: typography.family.regular,
    color: colors.textPrimary,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: alphaBg(colors.error, 0.12),
    borderWidth: 1,
    borderColor: alphaBg(colors.error, 0.35),
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: { flex: 1, fontSize: typography.sizes.sm, fontFamily: typography.family.medium, color: colors.error },

  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 52,
    ...shadows.glow,
    marginTop: spacing.md,
  },
  loginButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { fontSize: typography.sizes.base, fontFamily: typography.family.medium, color: colors.textInverted },

  forgotPasswordLink: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.sm },
  forgotPasswordText: { fontSize: typography.sizes.sm, fontFamily: typography.family.medium, color: colors.primary },
});
