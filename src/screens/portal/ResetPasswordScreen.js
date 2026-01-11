// src/screens/portal/ResetPasswordScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, SlideInLeft } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { useI18n } from '../../services/i18n/i18n';
import { usePasswordReset, useAcademies } from '../../services/portal/portal.hooks';
import { usePortal } from '../../services/portal/portal.store';
import { colors, spacing, radius, typography, shadows, alphaBg } from '../../theme/portal.styles';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ResetPasswordScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { academyId: storedAcademyId, setAcademyId } = usePortal();
  const { academies, loading: academiesLoading, searchQuery, setSearchQuery } = useAcademies();
  const { requestReset, isLoading, error } = usePasswordReset();

  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [showAcademyPicker, setShowAcademyPicker] = useState(false);

  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [localError, setLocalError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (storedAcademyId && academies.length > 0 && !selectedAcademy) {
      const found = academies.find((a) => a.id === Number(storedAcademyId));
      if (found) setSelectedAcademy(found);
    }
  }, [storedAcademyId, academies, selectedAcademy]);

  const validateForm = useCallback(() => {
    if (!selectedAcademy) return { valid: false, message: t('portal.login.error.selectAcademy', 'Select academy') };
    if (!username.trim()) return { valid: false, message: t('portal.reset.error.enterUsername', 'Enter username') };
    if (!phoneNumber.trim()) return { valid: false, message: t('portal.reset.error.enterPhone', 'Enter phone') };
    return { valid: true };
  }, [selectedAcademy, username, phoneNumber, t]);

  const handleAcademySelect = useCallback(
    async (academy) => {
      setSelectedAcademy(academy);
      setShowAcademyPicker(false);
      setSearchQuery('');
      await setAcademyId?.(academy.id);
    },
    [setAcademyId, setSearchQuery]
  );

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

  const handleSubmit = useCallback(async () => {
    const v = validateForm();
    if (!v.valid) {
      setLocalError(v.message);
      return;
    }

    setLocalError(null);
    setSubmitted(false);

    // Send academyId so proxy can resolve correct tenant using customer_id
    const result = await requestReset({
      academyId: selectedAcademy.id,
      username: username.trim(),
      phoneNumber: phoneNumber.trim(),
    });

    if (result.success) setSubmitted(true);
    else setLocalError(result.error || t('portal.reset.error.requestFailed', 'Request failed'));
  }, [validateForm, requestReset, selectedAcademy, username, phoneNumber, t]);

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <View style={styles.content}>
        <Animated.View entering={SlideInLeft.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('portal.reset.title', 'Reset Password')}</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {submitted ? (
          <Animated.View entering={FadeInDown} style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Feather name="mail" size={48} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>{t('portal.reset.successTitle', 'Check Your Phone')}</Text>
            <Text style={styles.successText}>
              {t(
                'portal.reset.successText',
                'We have sent password reset instructions to your registered phone number.'
              )}
            </Text>

            <Pressable onPress={() => router.replace('/portal/login')} style={styles.backToLoginButton}>
              <Feather name="log-in" size={18} color={colors.textInverted} style={{ marginRight: 8 }} />
              <Text style={styles.backToLoginText}>{t('portal.reset.backToLogin', 'Back to Login')}</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(100)} style={styles.instructions}>
              <Text style={styles.instructionsTitle}>{t('portal.reset.instructionsTitle', 'Forgot your password?')}</Text>
              <Text style={styles.instructionsText}>
                {t(
                  'portal.reset.instructionsText',
                  'Choose your academy, then enter your username and registered phone number.'
                )}
              </Text>
            </Animated.View>

            {/* Academy Picker */}
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

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>{t('portal.reset.username', 'Username')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('portal.reset.usernamePlaceholder', 'Enter your username')}
                  placeholderTextColor={colors.textTertiary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>{t('portal.reset.phoneNumber', 'Phone Number')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('portal.reset.phonePlaceholder', 'Enter your registered phone')}
                  placeholderTextColor={colors.textTertiary}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {!!displayError && (
                <Animated.View entering={FadeInDown} style={styles.errorBanner}>
                  <Feather name="alert-circle" size={18} color={colors.error} />
                  <Text style={styles.errorText}>{String(displayError)}</Text>
                </Animated.View>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                  isLoading && styles.submitButtonDisabled,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.textInverted} />
                ) : (
                  <>
                    <Feather name="send" size={18} color={colors.textInverted} style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>{t('portal.reset.sendCode', 'Send Reset Code')}</Text>
                  </>
                )}
              </Pressable>

              <Pressable onPress={() => router.back()} style={styles.cancelLink}>
                <Text style={styles.cancelText}>{t('portal.reset.cancel', 'Cancel')}</Text>
              </Pressable>
            </View>
          </>
        )}
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

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerTitle: { fontSize: typography.sizes.xl, fontFamily: typography.family.bold, color: colors.textPrimary },
  headerSpacer: { width: 40 },

  instructions: { marginBottom: spacing.lg, alignItems: 'center' },
  instructionsTitle: {
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.family.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.family.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },

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
    maxHeight: 260,
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
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: typography.sizes.sm, fontFamily: typography.family.regular, color: colors.textPrimary },
  loadingContainer: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { fontSize: typography.sizes.sm, fontFamily: typography.family.regular, color: colors.textSecondary },
  academyList: { maxHeight: 180 },
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

  form: { flex: 1 },
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

  submitButton: {
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
  submitButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: typography.sizes.base, fontFamily: typography.family.medium, color: colors.textInverted },

  cancelLink: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { fontSize: typography.sizes.sm, fontFamily: typography.family.medium, color: colors.textSecondary },

  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: alphaBg(colors.success, 0.15),
    borderWidth: 2,
    borderColor: alphaBg(colors.success, 0.35),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: { fontSize: typography.sizes['2xl'], fontFamily: typography.family.bold, color: colors.textPrimary, marginBottom: spacing.md, textAlign: 'center' },
  successText: { fontSize: typography.sizes.base, fontFamily: typography.family.regular, color: colors.textSecondary, textAlign: 'center', lineHeight: typography.sizes.base * typography.lineHeights.normal, marginBottom: spacing.xl },
  backToLoginButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', minHeight: 52, ...shadows.glow },
  backToLoginText: { fontSize: typography.sizes.base, fontFamily: typography.family.medium, color: colors.textInverted },
});
