// src/screens/portal/modals/EditProfileModal.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Image, ScrollView, StyleSheet, View, Text, Pressable, Alert } from 'react-native';

import { portalApi } from '../../../services/portal/portal.api';
import { usePortalOverview } from '../../../services/portal/portal.hooks';
import { portalStore } from '../../../services/portal/portal.store';
import { validators, validateMap } from '../../../services/portal/portal.validators';

import { colors, spacing, radius, typography, alphaBg } from '../../../theme/portal.styles';
import { PortalModal } from '../../../components/portal/PortalModal';
import { PortalButton, PortalCard, InlineError, StickyBar } from '../../../components/portal/PortalPrimitives';
import { Field, Input, TextArea } from '../../../components/portal/PortalForm';

const imgFromB64 = (b64) => {
  if (!b64) return null;
  if (String(b64).startsWith('data:')) return { uri: b64 };
  return { uri: `data:image/jpeg;base64,${b64}` };
};

async function pickImageAsDataUrl() {
  // expo-image-picker is preferred (Expo). If not installed, we show an alert.
  try {
    // eslint-disable-next-line global-require
    const ImagePicker = require('expo-image-picker');

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm?.granted) return null;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (res?.canceled) return null;

    const asset = res?.assets?.[0];
    if (!asset?.base64) return null;

    const mime = asset.mimeType || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${asset.base64}`;
    const size = asset.fileSize || asset.width * asset.height || null;

    return { dataUrl, mime, size };
  } catch (e) {
    Alert.alert(
      'Image Picker not available',
      'Install expo-image-picker or use your repo image util, then try again.'
    );
    return null;
  }
}

export const EditProfileModal = ({ visible, onClose }) => {
  const { overview, refresh } = usePortalOverview();

  const base = overview?.profile || {};
  const tryOutId = overview?.registration?.try_out?.id || overview?.registration?.try_out_id || null;

  const [form, setForm] = useState({
    try_out: tryOutId ? Number(tryOutId) : null,

    first_eng_name: '',
    middle_eng_name: '',
    last_eng_name: '',
    first_ar_name: '',
    middle_ar_name: '',
    last_ar_name: '',

    phone1: '',
    phone2: '',
    date_of_birth: '',

    address: '',
    google_maps_location: '',

    height: '',
    weight: '',

    image: null, // data-url
    image_type: null,
    image_size: null,
  });

  const [avatarPreview, setAvatarPreview] = useState(null);

  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState('');

  useEffect(() => {
    if (!visible) return;

    const h = overview?.health_info || {};
    setForm({
      try_out: tryOutId ? Number(tryOutId) : null,

      first_eng_name: base.first_eng_name || '',
      middle_eng_name: base.middle_eng_name || '',
      last_eng_name: base.last_eng_name || '',
      first_ar_name: base.first_ar_name || '',
      middle_ar_name: base.middle_ar_name || '',
      last_ar_name: base.last_ar_name || '',

      phone1: base.phone1 || overview?.player?.phone || '',
      phone2: base.phone2 || overview?.player?.phone2 || '',
      date_of_birth: (base.date_of_birth || '').slice(0, 10),

      address: base.address || overview?.registration?.address || '',
      google_maps_location: base.google_maps_location || overview?.registration?.google_maps_location || '',

      height: h.height == null ? (base.height == null ? '' : String(base.height)) : String(h.height),
      weight: h.weight == null ? (base.weight == null ? '' : String(base.weight)) : String(h.weight),

      image: null,
      image_type: null,
      image_size: null,
    });
    setAvatarPreview(null);
    setErrs({});
    setTopError('');
  }, [visible, base, overview, tryOutId]);

  const schema = useMemo(
    () => ({
      try_out: [(v) => validators.required(v, 'Try-out is required')],
      phone1: [(v) => validators.phone(v, 'Phone 1 looks invalid')],
      phone2: [(v) => validators.phone(v, 'Phone 2 looks invalid')],
      date_of_birth: [(v) => validators.dateISO(v, 'Use YYYY-MM-DD')],
      google_maps_location: [(v) => validators.url(v, 'Invalid link')],
      height: [(v) => validators.number(v, 'Height must be a number')],
      weight: [(v) => validators.number(v, 'Weight must be a number')],
    }),
    []
  );

  const onPickAvatar = useCallback(async () => {
    const picked = await pickImageAsDataUrl();
    if (!picked) return;
    setForm((prev) => ({
      ...prev,
      image: picked.dataUrl,
      image_type: picked.mime,
      image_size: picked.size,
    }));
    setAvatarPreview(picked.dataUrl);
  }, []);

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = useCallback(() => {
    const e = validateMap(form, schema);

    // extra: basic numeric bounds (soft)
    if (form.height !== '' && Number(form.height) <= 0) e.height = 'Height must be > 0';
    if (form.weight !== '' && Number(form.weight) <= 0) e.weight = 'Weight must be > 0';

    setErrs(e);
    setTopError(Object.keys(e).length ? 'Please fix the highlighted fields.' : '');
    return !Object.keys(e).length;
  }, [form, schema]);

  const submit = useCallback(async () => {
    if (!validate()) return;

    setBusy(true);
    setTopError('');
    try {
      const payload = {
        try_out: Number(form.try_out),

        first_eng_name: String(form.first_eng_name || '').trim(),
        middle_eng_name: String(form.middle_eng_name || '').trim(),
        last_eng_name: String(form.last_eng_name || '').trim(),
        first_ar_name: String(form.first_ar_name || '').trim(),
        middle_ar_name: String(form.middle_ar_name || '').trim(),
        last_ar_name: String(form.last_ar_name || '').trim(),

        phone1: String(form.phone1 || '').trim(),
        phone2: String(form.phone2 || '').trim(),
        date_of_birth: form.date_of_birth || undefined,

        address: String(form.address || '').trim(),
        google_maps_location: String(form.google_maps_location || '').trim(),

        height: form.height === '' ? null : Number(form.height),
        weight: form.weight === '' ? null : Number(form.weight),
      };

      if (form.image && form.image_type && form.image_size != null) {
        payload.image = form.image; // data-url (backend strips prefix if needed)
        payload.image_type = form.image_type;
        payload.image_size = form.image_size;
      }

      await portalApi.updateProfile(payload);

      // refresh overview cache (store + hook)
      await refresh();
      // (extra safety) mark store updated
      const snap = portalStore.getState().overview;
      if (snap) portalStore.setOverview({ normalized: snap });

      onClose?.();
    } catch (e) {
      setTopError(e?.message || 'Failed to update profile.');
    } finally {
      setBusy(false);
    }
  }, [form, validate, refresh, onClose]);

  const avatar = avatarPreview
    ? imgFromB64(avatarPreview)
    : imgFromB64(overview?.player?.imageBase64);

  return (
    <PortalModal
      visible={visible}
      title="Edit Profile"
      subtitle="Update your identity, contact & health details."
      onClose={busy ? null : onClose}
      footer={null}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {!!topError && <InlineError text={topError} />}

        <PortalCard title="Photo" subtitle="Tap to update your profile picture." style={{ marginTop: spacing.md }}>
          <View style={styles.photoRow}>
            <View style={styles.avatarWrap}>
              {avatar ? (
                <Image source={avatar} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackText}>P</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.photoHint}>Square photos work best.</Text>
              <PortalButton label="Choose photo" variant="secondary" onPress={onPickAvatar} disabled={busy} />
            </View>
          </View>
        </PortalCard>

        <PortalCard title="Identity" subtitle="Keep your names consistent with academy records." style={{ marginTop: spacing.md }}>
          <Field label="Try-out *" error={errs.try_out}>
            <Input value={form.try_out ? String(form.try_out) : ''} onChangeText={(v) => set('try_out')(v.replace(/[^\d]/g, ''))} placeholder="Try-out ID" keyboardType="number-pad" />
          </Field>

          <Field label="First name (EN)">
            <Input value={form.first_eng_name} onChangeText={set('first_eng_name')} placeholder="First name (English)" autoCapitalize="words" />
          </Field>
          <Field label="Middle name (EN)">
            <Input value={form.middle_eng_name} onChangeText={set('middle_eng_name')} placeholder="Middle name (English)" autoCapitalize="words" />
          </Field>
          <Field label="Last name (EN)">
            <Input value={form.last_eng_name} onChangeText={set('last_eng_name')} placeholder="Last name (English)" autoCapitalize="words" />
          </Field>

          <Field label="First name (AR)">
            <Input value={form.first_ar_name} onChangeText={set('first_ar_name')} placeholder="الاسم الأول" autoCapitalize="none" />
          </Field>
          <Field label="Middle name (AR)">
            <Input value={form.middle_ar_name} onChangeText={set('middle_ar_name')} placeholder="اسم الأب" autoCapitalize="none" />
          </Field>
          <Field label="Last name (AR)">
            <Input value={form.last_ar_name} onChangeText={set('last_ar_name')} placeholder="اسم العائلة" autoCapitalize="none" />
          </Field>

          <Field label="Date of birth" error={errs.date_of_birth} hint="Format: YYYY-MM-DD">
            <Input value={form.date_of_birth} onChangeText={set('date_of_birth')} placeholder="YYYY-MM-DD" />
          </Field>
        </PortalCard>

        <PortalCard title="Contact" subtitle="We use these numbers for reminders & updates." style={{ marginTop: spacing.md }}>
          <Field label="Phone 1" error={errs.phone1}>
            <Input value={form.phone1} onChangeText={set('phone1')} placeholder="+9627..." keyboardType="phone-pad" />
          </Field>
          <Field label="Phone 2" error={errs.phone2}>
            <Input value={form.phone2} onChangeText={set('phone2')} placeholder="Optional" keyboardType="phone-pad" />
          </Field>
        </PortalCard>

        <PortalCard title="Address" subtitle="Optional but helps coaches and pickup." style={{ marginTop: spacing.md }}>
          <Field label="Address">
            <TextArea value={form.address} onChangeText={set('address')} placeholder="City, area, landmark..." />
          </Field>
          <Field label="Google Maps link" error={errs.google_maps_location}>
            <Input value={form.google_maps_location} onChangeText={set('google_maps_location')} placeholder="https://maps.app.goo.gl/..." />
          </Field>
        </PortalCard>

        <PortalCard title="Health" subtitle="Used in Fitness screen and coach notes." style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field label="Height (cm)" error={errs.height}>
                <Input value={String(form.height)} onChangeText={set('height')} placeholder="170" keyboardType="numeric" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Weight (kg)" error={errs.weight}>
                <Input value={String(form.weight)} onChangeText={set('weight')} placeholder="65" keyboardType="numeric" />
              </Field>
            </View>
          </View>
        </PortalCard>
      </ScrollView>

      <StickyBar>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <PortalButton label="Cancel" variant="secondary" onPress={onClose} disabled={busy} />
          </View>
          <View style={{ flex: 1 }}>
            <PortalButton label={busy ? 'Saving...' : 'Save changes'} onPress={submit} disabled={busy} />
          </View>
        </View>
        <View style={styles.stickyHint}>
          <Text style={styles.stickyHintText}>
            Tip: Keep your “Try-out” correct — it links your portal data.
          </Text>
        </View>
      </StickyBar>
    </PortalModal>
  );
};

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: radius.round,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.backgroundElevated,
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { color: colors.textPrimary, fontFamily: typography.family.bold, fontSize: 24 },
  photoHint: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  stickyHint: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: alphaBg(colors.primary, 0.10),
    borderWidth: 1,
    borderColor: alphaBg(colors.primary, 0.25),
  },
  stickyHintText: {
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.xs * 1.35,
  },
});
