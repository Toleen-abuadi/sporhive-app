// src/screens/portal/modals/EditProfileModal.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Image, ScrollView, StyleSheet, View, Text, Pressable, Alert } from 'react-native';

import { portalApi } from '../../../services/portal/portal.api';
import { usePortal } from '../../../services/portal/portal.hooks';
import { validators, validateMap } from '../../../services/portal/portal.validators';

import { colors, spacing, radius, typography } from '../../../theme/portal.styles';
import { PortalModal } from '../../../components/portal/PortalModal';
import { PortalButton, PortalCard, InlineError, StickyBar } from '../../../components/portal/PortalPrimitives';
import { Field, Input, TextArea } from '../../../components/portal/PortalForm';

async function pickImageAsDataUrl() {
  try {
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
  const { overview, refresh } = usePortal();

  const rawPlayer = overview?.raw?.player_info || {};
  const rawReg = overview?.raw?.registration_info || {};
  const rawHealth = overview?.raw?.health_info || {};

  const player = overview?.player || {};
  const tryOutId = rawReg?.try_out_id || rawReg?.try_out || overview?.registration?.id || null;

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

    image: null,
    image_type: null,
    image_size: null,
  });

  const [avatarPreview, setAvatarPreview] = useState(null);

  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState('');

  useEffect(() => {
    if (!visible) return;

    setForm({
      try_out: tryOutId ? Number(tryOutId) : null,

      first_eng_name: rawPlayer.first_eng_name || '',
      middle_eng_name: rawPlayer.middle_eng_name || '',
      last_eng_name: rawPlayer.last_eng_name || '',
      first_ar_name: rawPlayer.first_ar_name || '',
      middle_ar_name: rawPlayer.middle_ar_name || '',
      last_ar_name: rawPlayer.last_ar_name || '',

      phone1: rawPlayer.phone_number_1 || player.phoneNumbers?.[0] || '',
      phone2: rawPlayer.phone_number_2 || player.phoneNumbers?.[1] || '',
      date_of_birth: (rawPlayer.date_of_birth || player.dob || '').slice(0, 10),

      address: rawReg.address || '',
      google_maps_location: rawReg.google_maps_location || '',

      height: rawHealth.height == null ? '' : String(rawHealth.height),
      weight: rawHealth.weight == null ? '' : String(rawHealth.weight),

      image: null,
      image_type: null,
      image_size: null,
    });
    setAvatarPreview(null);
    setErrs({});
    setTopError('');
  }, [visible, rawHealth.height, rawHealth.weight, rawPlayer, rawReg, player.dob, player.phoneNumbers, tryOutId]);

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

  const validate = useCallback(() => {
    const e = validateMap(form, schema);

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
        payload.image = form.image;
        payload.image_type = form.image_type;
        payload.image_size = form.image_size;
      }

      await portalApi.updateProfile(payload);
      await refresh();
      onClose?.();
    } catch (e) {
      setTopError(e?.message || 'Failed to update profile.');
    } finally {
      setBusy(false);
    }
  }, [form, onClose, refresh, validate]);

  const avatar = avatarPreview || player?.avatar?.uri;

  return (
    <PortalModal
      visible={visible}
      title="Edit Profile"
      subtitle="Update your personal information."
      onClose={busy ? null : onClose}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {!!topError && <InlineError text={topError} />}

        <PortalCard title="Avatar" subtitle="Optional profile picture.">
          <View style={styles.avatarRow}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>
                  {(player.fullNameEn || player.fullNameAr || 'P').trim().slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <PortalButton title="Change" tone="secondary" onPress={onPickAvatar} />
          </View>
        </PortalCard>

        <PortalCard title="Names" subtitle="English & Arabic">
          <Field label="First name (English)">
            <Input value={form.first_eng_name} onChangeText={(v) => setForm((p) => ({ ...p, first_eng_name: v }))} />
          </Field>
          <Field label="Middle name (English)">
            <Input value={form.middle_eng_name} onChangeText={(v) => setForm((p) => ({ ...p, middle_eng_name: v }))} />
          </Field>
          <Field label="Last name (English)">
            <Input value={form.last_eng_name} onChangeText={(v) => setForm((p) => ({ ...p, last_eng_name: v }))} />
          </Field>
          <Field label="First name (Arabic)">
            <Input value={form.first_ar_name} onChangeText={(v) => setForm((p) => ({ ...p, first_ar_name: v }))} />
          </Field>
          <Field label="Middle name (Arabic)">
            <Input value={form.middle_ar_name} onChangeText={(v) => setForm((p) => ({ ...p, middle_ar_name: v }))} />
          </Field>
          <Field label="Last name (Arabic)">
            <Input value={form.last_ar_name} onChangeText={(v) => setForm((p) => ({ ...p, last_ar_name: v }))} />
          </Field>
        </PortalCard>

        <PortalCard title="Contact">
          <Field label="Phone 1" error={errs.phone1}>
            <Input value={form.phone1} onChangeText={(v) => setForm((p) => ({ ...p, phone1: v }))} keyboardType="phone-pad" />
          </Field>
          <Field label="Phone 2" error={errs.phone2}>
            <Input value={form.phone2} onChangeText={(v) => setForm((p) => ({ ...p, phone2: v }))} keyboardType="phone-pad" />
          </Field>
          <Field label="Date of birth" error={errs.date_of_birth}>
            <Input value={form.date_of_birth} onChangeText={(v) => setForm((p) => ({ ...p, date_of_birth: v }))} placeholder="YYYY-MM-DD" />
          </Field>
        </PortalCard>

        <PortalCard title="Address">
          <Field label="Address">
            <TextArea value={form.address} onChangeText={(v) => setForm((p) => ({ ...p, address: v }))} />
          </Field>
          <Field label="Google maps link" error={errs.google_maps_location}>
            <Input value={form.google_maps_location} onChangeText={(v) => setForm((p) => ({ ...p, google_maps_location: v }))} />
          </Field>
        </PortalCard>

        <PortalCard title="Health">
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field label="Height (cm)" error={errs.height}>
                <Input value={String(form.height)} onChangeText={(v) => setForm((p) => ({ ...p, height: v.replace(/[^\d.]/g, '') }))} keyboardType="decimal-pad" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Weight (kg)" error={errs.weight}>
                <Input value={String(form.weight)} onChangeText={(v) => setForm((p) => ({ ...p, weight: v.replace(/[^\d.]/g, '') }))} keyboardType="decimal-pad" />
              </Field>
            </View>
          </View>
        </PortalCard>
      </ScrollView>

      <StickyBar>
        <PortalButton title={busy ? 'Saving…' : 'Save'} onPress={submit} disabled={busy} />
      </StickyBar>
    </PortalModal>
  );
};

const styles = StyleSheet.create({
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.backgroundElevated,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: 24,
  },
});
