// src/screens/portal/PortalProfileScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';

import { useI18n } from '../../services/i18n/i18n';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { useAuth } from '../../services/auth/auth.store';
import { isPortalForbiddenError } from '../../services/portal/portal.errors';
import { spacing } from '../../theme/tokens';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { useToast } from '../../components/ui/ToastHost';

function safeStr(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}
function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}
function toNumOrNull(v) {
  const s = safeStr(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function PortalProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const actions = usePlayerPortalActions();
  const toast = useToast();
  const { ensurePortalReauthOnce } = useAuth();
  const reauthHandledRef = useRef(false);

  const {
    profile,
    profileLoading,
    profileError,
    updatingProfile,
    profileUpdateError,
  } = usePlayerPortalStore((state) => ({
    profile: state.profile,
    profileLoading: state.profileLoading,
    profileError: state.profileError,
    updatingProfile: state.updatingProfile,
    profileUpdateError: state.profileUpdateError,
  }));

  const placeholder = t('portal.common.placeholder');

  const player = useMemo(() => profile?.player || {}, [profile]);
  const registration = useMemo(() => profile?.registration || {}, [profile]);
  const health = useMemo(() => profile?.health || profile?.healthInfo || profile?.health_info || {}, [profile]);

  const phoneNumbers = useMemo(() => {
    // support both normalized and raw shapes
    const pn =
      player.phoneNumbers ||
      player.phone_numbers ||
      player.phone_numbers_obj ||
      player.phone_numbers_map ||
      null;

    if (pn && typeof pn === 'object') {
      // { "1": "+962..", "2": "+962.." }
      const p1 = pn['1'] || pn[1];
      const p2 = pn['2'] || pn[2];
      return {
        phone1: safeStr(p1),
        phone2: safeStr(p2),
      };
    }

    return {
      phone1: safeStr(player.phone || player.phone1 || player.phone_number_1 || ''),
      phone2: safeStr(player.phone2 || player.phone_number_2 || ''),
    };
  }, [player]);

  // ----------- Edit state -----------
  const [editMode, setEditMode] = useState(false);
  const isSaving = Boolean(updatingProfile);

  const [formErrors, setFormErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState('');
  const [form, setForm] = useState({
    first_eng_name: '',
    middle_eng_name: '',
    last_eng_name: '',
    first_ar_name: '',
    middle_ar_name: '',
    last_ar_name: '',
    phone1: '',
    phone2: '',
    email: '',
    date_of_birth: '',
    address: '',
    google_maps_location: '',
    height: '',
    weight: '',
  });

  const hydrateFormFromProfile = useCallback(() => {
    const p = profile?.player || {};
    const r = profile?.registration || {};
    const h = profile?.health || profile?.healthInfo || profile?.health_info || {};

    const first_eng_name = pickFirst(p.firstEngName, p.first_eng_name);
    const middle_eng_name = pickFirst(p.middleEngName, p.middle_eng_name);
    const last_eng_name = pickFirst(p.lastEngName, p.last_eng_name);

    const first_ar_name = pickFirst(p.firstArName, p.first_ar_name);
    const middle_ar_name = pickFirst(p.middleArName, p.middle_ar_name);
    const last_ar_name = pickFirst(p.lastArName, p.last_ar_name);

    const email = pickFirst(p.email);

    const date_of_birth = pickFirst(p.dateOfBirth, p.date_of_birth);
    const address = pickFirst(r.address);
    const google_maps_location = pickFirst(r.googleMapsLocation, r.google_maps_location);

    setForm({
      first_eng_name: safeStr(first_eng_name),
      middle_eng_name: safeStr(middle_eng_name),
      last_eng_name: safeStr(last_eng_name),
      first_ar_name: safeStr(first_ar_name),
      middle_ar_name: safeStr(middle_ar_name),
      last_ar_name: safeStr(last_ar_name),
      phone1: safeStr(phoneNumbers.phone1),
      phone2: safeStr(phoneNumbers.phone2),
      email: safeStr(email),
      date_of_birth: safeStr(date_of_birth).slice(0, 10),
      address: safeStr(address),
      google_maps_location: safeStr(google_maps_location),
      height: h?.height != null ? String(h.height) : '',
      weight: h?.weight != null ? String(h.weight) : '',
    });
  }, [profile, phoneNumbers]);

  useEffect(() => {
    actions.fetchProfile();
  }, [actions]);

  const load = useCallback(() => actions.fetchProfile(), [actions]);
  const handleReauthRequired = useCallback(async () => {
    if (reauthHandledRef.current) return;
    reauthHandledRef.current = true;
    const res = await ensurePortalReauthOnce?.();
    if (res?.success) {
      reauthHandledRef.current = false;
      load();
      return;
    }
    router.replace('/(auth)/login?mode=player');
  }, [ensurePortalReauthOnce, load, router]);

  useEffect(() => {
    if (profile && !editMode) hydrateFormFromProfile();
  }, [profile, editMode, hydrateFormFromProfile]);

  const setField = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const startEdit = () => {
    hydrateFormFromProfile();
    setEditMode(true);
  };

  const cancelEdit = () => {
    hydrateFormFromProfile();
    setEditMode(false);
  };


  const validateForm = () => {
    const next = {};
    if (!form.first_eng_name.trim()) next.first_eng_name = 'First name is required.';
    if (!form.last_eng_name.trim()) next.last_eng_name = 'Last name is required.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      // Payload matches the web page behavior (snake_case + health + registration fields)
      const payload = {
        first_eng_name: form.first_eng_name.trim(),
        middle_eng_name: form.middle_eng_name.trim(),
        last_eng_name: form.last_eng_name.trim(),
        first_ar_name: form.first_ar_name.trim(),
        middle_ar_name: form.middle_ar_name.trim(),
        last_ar_name: form.last_ar_name.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim(),
        date_of_birth: form.date_of_birth ? form.date_of_birth : undefined,
        email: form.email.trim() || undefined,

        address: form.address.trim(),
        google_maps_location: form.google_maps_location.trim(),

        height: toNumOrNull(form.height),
        weight: toNumOrNull(form.weight),
      };

      // If your store method name differs, adjust here:
      const res = await (actions.updateProfile?.(payload) ??
        actions.updatePlayerProfile?.(payload));

      // Many stores return {success} or {ok}. We accept either.
      const ok = res?.ok === true || res?.success === true || res?.data != null;

      if (ok) {
        setEditMode(false);
        setSaveMessage(t('portal.profile.updateSuccess') || 'Profile updated successfully');
        toast?.show?.({ type: 'success', message: t('portal.profile.updateSuccess') || 'Profile updated successfully' });
      } else {
        const status = res?.error?.status ?? profileUpdateError?.status ?? null;
        const msg =
          status === 400
            ? (t('portal.profile.updateBadRequest') || 'Please check the entered values.')
            : status === 401
              ? (t('portal.errors.reAuthAction') || 'Please sign in again.')
              : status === 403
                ? (t('portal.errors.forbidden') || 'You do not have access to do this.')
                : (t('portal.common.somethingWentWrong') || 'Something went wrong.');
toast?.show?.({ type: 'error', message: msg });
      }
    } catch (_e) {
      // Defensive catch: store already normalizes, but ensure we never fail silently.
      toast?.show?.({ type: 'error', message: t('portal.common.somethingWentWrong') || 'Something went wrong.' });
    }
  };

  // ----------- Loading / Error states -----------
  if (profileLoading && !profile) {
    return (
      <AppScreen safe>
        <View style={styles.skeletonWrap}>
          <Skeleton height={120} radius={16} />
          <Skeleton height={260} radius={16} />
          <Skeleton height={260} radius={16} />
        </View>
      </AppScreen>
    );
  }

  if (profileError && !profile) {
    const isForbidden = isPortalForbiddenError(profileError);
    return (
      <AppScreen safe>
        <EmptyState
          title={isForbidden ? t('portal.errors.forbiddenTitle') : t('portal.profile.errorTitle')}
          message={
            isForbidden
              ? t('portal.errors.forbiddenDescription')
              : (profileError?.message || t('portal.profile.errorDescription'))
          }
          actionLabel={t('portal.common.retry')}
          onAction={load}
        />
      </AppScreen>
    );
  }

  // ----------- View mode values -----------
  const fullNameEn =
    `${pickFirst(player.firstEngName, player.first_eng_name, '')} ${pickFirst(
      player.lastEngName,
      player.last_eng_name,
      ''
    )}`.trim() || placeholder;

  const fullNameAr =
    `${pickFirst(player.firstArName, player.first_ar_name, '')} ${pickFirst(
      player.lastArName,
      player.last_ar_name,
      ''
    )}`.trim() || placeholder;

  const emailText = player.email || placeholder;

  const regType = registration.registrationType || registration.registration_type || placeholder;
  const groupName = registration.groupName || registration.group_name || placeholder;
  const courseName = registration.courseName || registration.course_name || placeholder;
  const periodText =
    registration.startDate && registration.endDate
      ? `${registration.startDate} • ${registration.endDate}`
      : placeholder;

  // ----------- Header right action -----------
  const RightAction = () => (
    <View style={styles.headerRight}>
      {editMode ? (
        <>
          <Button
            variant="secondary"
            size="sm"
            onPress={cancelEdit}
            disabled={isSaving}
            style={styles.headerBtn}
          >
            {t('portal.common.cancel')}
          </Button>
          <Button size="sm" onPress={handleSave} disabled={isSaving} style={styles.headerBtn}>
            {isSaving ? t('portal.common.saving') : t('portal.common.save')}
          </Button>
        </>
      ) : (
        <TouchableOpacity onPress={startEdit} activeOpacity={0.8} style={styles.editPill}>
          <Text variant="bodySmall" weight="bold" color="#fff">
            {t('portal.common.edit')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <PortalAccessGate titleOverride={t('portal.profile.title')} error={profileError} onRetry={load} onReauthRequired={handleReauthRequired}>
      <AppScreen safe scroll>
        <AppHeader
          title={t('portal.profile.title')}
          subtitle={t('portal.profile.subtitle')}
          rightSlot={<RightAction />}
        />
        <PortalActionBanner title="Profile setup" description="Update contact and player details. Save is disabled while changes are being submitted." />
        {saveMessage ? <Card style={[styles.savedCard, { backgroundColor: `${colors.success}12`, borderColor: colors.success }]}><Text variant="caption" weight="bold" color={colors.success}>{saveMessage}</Text></Card> : null}

        {/* -------- Player Card -------- */}
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="body" weight="bold" color={colors.textPrimary}>
            {t('portal.profile.sectionPlayer')}
          </Text>

          {/* VIEW */}
          {!editMode ? (
            <>
              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.nameEn')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {fullNameEn}
                </Text>
              </View>

              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.nameAr')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {fullNameAr}
                </Text>
              </View>

              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.phone')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {phoneNumbers.phone1 || placeholder}
                </Text>
              </View>

              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.phone2')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {phoneNumbers.phone2 || placeholder}
                </Text>
              </View>

              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.email')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {emailText}
                </Text>
              </View>
            </>
          ) : (
            // EDIT
            <View style={styles.formGrid}>
              <Text variant="caption" weight="bold" color={colors.textMuted}>Contact</Text>
              <Text variant="caption" weight="bold" color={colors.textMuted}>Player info</Text>
              <Input
                label={t('portal.profile.firstNameEn')}
                value={form.first_eng_name}
                onChangeText={setField('first_eng_name')}
                error={formErrors.first_eng_name}
              />
              <Input
                label={t('portal.profile.middleNameEn')}
                value={form.middle_eng_name}
                onChangeText={setField('middle_eng_name')}
              />
              <Input
                label={t('portal.profile.lastNameEn')}
                value={form.last_eng_name}
                onChangeText={setField('last_eng_name')}
                error={formErrors.last_eng_name}
              />

              <Input
                label={t('portal.profile.firstNameAr')}
                value={form.first_ar_name}
                onChangeText={setField('first_ar_name')}
              />
              <Input
                label={t('portal.profile.middleNameAr')}
                value={form.middle_ar_name}
                onChangeText={setField('middle_ar_name')}
              />
              <Input
                label={t('portal.profile.lastNameAr')}
                value={form.last_ar_name}
                onChangeText={setField('last_ar_name')}
              />

              <Input
                label={t('portal.profile.phone1')}
                value={form.phone1}
                onChangeText={setField('phone1')}
                keyboardType="phone-pad"
              />
              <Input
                label={t('portal.profile.phone2')}
                value={form.phone2}
                onChangeText={setField('phone2')}
                keyboardType="phone-pad"
              />
              <Input
                label={t('portal.profile.email')}
                value={form.email}
                onChangeText={setField('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                error={formErrors.email}
              />
              <Input
                label={t('portal.profile.dob')}
                value={form.date_of_birth}
                onChangeText={setField('date_of_birth')}
                placeholder={t('portal.profile.dobPlaceholder')}
              />
            </View>
          )}
        </Card>

        {/* -------- Registration / Address / Health -------- */}
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="body" weight="bold" color={colors.textPrimary}>
            {t('portal.profile.sectionRegistration')}
          </Text>

          {!editMode ? (
            <>
              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.registrationType')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {regType}
                </Text>
              </View>

              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.group')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {groupName}
                </Text>
              </View>

              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.course')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {courseName}
                </Text>
              </View>

              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.period')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {periodText}
                </Text>
              </View>

              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.address')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {registration.address || placeholder}
                </Text>
              </View>

              <View style={styles.row}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('portal.profile.maps')}
                </Text>
                <Text variant="bodySmall" color={colors.textPrimary}>
                  {registration.googleMapsLocation || registration.google_maps_location || placeholder}
                </Text>
              </View>

              <View style={styles.rowInline}>
                <View style={styles.inlineBox}>
                  <Text variant="caption" color={colors.textMuted}>
                    {t('portal.profile.height')}
                  </Text>
                  <Text variant="bodySmall" color={colors.textPrimary}>
                    {health?.height != null ? `${health.height}` : placeholder}
                  </Text>
                </View>
                <View style={styles.inlineBox}>
                  <Text variant="caption" color={colors.textMuted}>
                    {t('portal.profile.weight')}
                  </Text>
                  <Text variant="bodySmall" color={colors.textPrimary}>
                    {health?.weight != null ? `${health.weight}` : placeholder}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.formGrid}>
              <Input
                label={t('portal.profile.address')}
                value={form.address}
                onChangeText={setField('address')}
                multiline
              />
              <Input
                label={t('portal.profile.mapsLink')}
                value={form.google_maps_location}
                onChangeText={setField('google_maps_location')}
                autoCapitalize="none"
              />
              <View style={styles.rowInline}>
                <View style={styles.inlineField}>
                  <Input
                    label={t('portal.profile.height')}
                    value={form.height}
                    onChangeText={setField('height')}
                    keyboardType="numeric"
                    placeholder={t('portal.profile.heightPlaceholder')}
                  />
                </View>
                <View style={styles.inlineField}>
                  <Input
                    label={t('portal.profile.weight')}
                    value={form.weight}
                    onChangeText={setField('weight')}
                    keyboardType="numeric"
                    placeholder={t('portal.profile.weightPlaceholder')}
                  />
                </View>
              </View>

              <View style={styles.bottomSaveWrap}>
                <Button onPress={handleSave} disabled={isSaving}>
                  {isSaving ? t('portal.common.saving') : t('portal.common.save')}
                </Button>
                <Button variant="secondary" onPress={cancelEdit} disabled={isSaving}>
                  {t('portal.common.cancel')}
                </Button>
              </View>
            </View>
          )}
        </Card>
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    gap: 4,
    marginTop: spacing.sm,
  },
  rowInline: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  inlineBox: {
    flex: 1,
    gap: 4,
  },
  skeletonWrap: {
    padding: spacing.lg,
    gap: spacing.lg,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerBtn: {
    minWidth: 84,
  },
  editPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FF7A00',
  },

  formGrid: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  savedCard: { borderWidth: 1, borderRadius: 12, padding: spacing.sm, marginBottom: spacing.md },
  inlineField: {
    flex: 1,
  },
  bottomSaveWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
