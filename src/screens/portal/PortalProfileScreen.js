// Portal Profile Screen: view and edit player profile details.
import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { usePortalAuth, usePortalOverview, usePortalProfile } from '../../services/portal/portal.hooks';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';
import * as ImagePicker from 'expo-image-picker';

export function PortalProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { overview } = usePortalOverview();
  const { profile, saveProfile, loading, refresh } = usePortalProfile();
  const { logout } = usePortalAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
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
    image_base64: '',
  });

  const player = overview?.player || {};
  const health = overview?.health || {};
  const registration = overview?.registration || {};

  useEffect(() => {
    if (overview?.player) {
      const player = overview.player;
      const health = overview.health || {};

      setForm({
        first_eng_name: player.firstEngName || '',
        middle_eng_name: player.middleEngName || '',
        last_eng_name: player.lastEngName || '',
        first_ar_name: player.firstArName || '',
        middle_ar_name: player.middleArName || '',
        last_ar_name: player.lastArName || '',
        phone1: player.phone || '',
        phone2: player.phone2 || '',
        date_of_birth: player.dateOfBirth || '',
        address: registration.address || '',
        google_maps_location: registration.googleMapsLocation || '',
        height: String(health.height || ''),
        weight: String(health.weight || ''),
        image_base64: player.imageBase64 || '',
      });
    }
  }, [overview]);

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        ...profile,
        image_base64: profile.image_base64 || prev.image_base64,
      }));
    }
  }, [profile]);

  const initials = useMemo(() => {
    const name = player?.fullName || 'Player';
    return name.slice(0, 1).toUpperCase();
  }, [player?.fullName]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      setForm((prev) => ({ ...prev, image_base64: result.assets[0].base64 }));
    }
  };

  const onSave = async () => {
    const payload = {
      ...form,
      phone_number_1: form.phone1,
      phone_number_2: form.phone2,
      image_base64: form.image_base64,
    };
    const res = await saveProfile(payload);
    if (res?.success) {
      await refresh();
      setIsEditing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/portal/login');
  };

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader title={t('portal.profile.title')} subtitle={t('portal.profile.subtitle')} />

      <PortalCard style={styles.card}>
        <View style={styles.identityRow}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated || colors.surface }]}
          >
            {player?.imageBase64 ? (
              <Image source={{ uri: player.imageBase64 }} style={styles.avatarImage} />
            ) : (
              <Text variant="h3" weight="bold" color={colors.textPrimary}>
                {initials}
              </Text>
            )}
          </View>
          <View style={styles.identityInfo}>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {player?.fullName || t('portal.profile.playerName')}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {overview?.academyName || t('portal.profile.academy')}
            </Text>
            <Text variant="caption" color={colors.textMuted} style={styles.meta}>
              {t('portal.profile.playerId')} #{player?.id || '—'}
            </Text>
          </View>
          <Button variant="secondary" size="small" onPress={() => setIsEditing(true)}>
            {t('common.edit')}
          </Button>
        </View>
      </PortalCard>

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          {t('portal.profile.contact')}
        </Text>
        <View style={styles.infoRow}>
          <View>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.phone1')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {player?.phone || '—'}
            </Text>
          </View>
          <View>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.phone2')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {player?.phone2 || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.dob')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {player?.dateOfBirth || '—'}
            </Text>
          </View>
          <View>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.profile.heightWeight')}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary}>
              {health?.height || '—'} cm • {health?.weight || '—'} kg
            </Text>
          </View>
        </View>
      </PortalCard>

      <PortalCard style={styles.card}>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.meta}>
          {registration?.address || t('portal.profile.noAddress')}
        </Text>
        <Text variant="caption" color={colors.textMuted} style={styles.meta}>
          {registration?.googleMapsLocation || t('portal.profile.noMap')}
        </Text>
        <Button variant="secondary" style={styles.logoutButton} onPress={handleLogout}>
          {t('portal.profile.logout')}
        </Button>
      </PortalCard>

      <Modal visible={isEditing} transparent animationType="slide">
        <View style={[styles.modalBackdrop, { backgroundColor: colors.black + '55' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text variant="body" weight="semibold" color={colors.textPrimary}>
                {t('portal.profile.editTitle')}
              </Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
              <View style={[styles.photoCircle, { backgroundColor: colors.surfaceElevated || colors.surface }]}>
                {form.image_base64 ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${form.image_base64}` }}
                    style={styles.photoCircle}
                  />
                ) : (
                  <Text variant="bodySmall" color={colors.textMuted}>
                    {t('portal.profile.addPhoto')}
                  </Text>
                )}
              </View>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('portal.profile.photoHint')}
              </Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.formGrid} showsVerticalScrollIndicator={false}>
              <Input label={t('portal.profile.firstNameEn')} value={form.first_eng_name} onChangeText={(v) => setForm((p) => ({ ...p, first_eng_name: v }))} />
              <Input label={t('portal.profile.middleNameEn')} value={form.middle_eng_name} onChangeText={(v) => setForm((p) => ({ ...p, middle_eng_name: v }))} />
              <Input label={t('portal.profile.lastNameEn')} value={form.last_eng_name} onChangeText={(v) => setForm((p) => ({ ...p, last_eng_name: v }))} />
              <Input label={t('portal.profile.firstNameAr')} value={form.first_ar_name} onChangeText={(v) => setForm((p) => ({ ...p, first_ar_name: v }))} />
              <Input label={t('portal.profile.middleNameAr')} value={form.middle_ar_name} onChangeText={(v) => setForm((p) => ({ ...p, middle_ar_name: v }))} />
              <Input label={t('portal.profile.lastNameAr')} value={form.last_ar_name} onChangeText={(v) => setForm((p) => ({ ...p, last_ar_name: v }))} />
              <Input label={t('portal.profile.phone1')} value={form.phone1} onChangeText={(v) => setForm((p) => ({ ...p, phone1: v }))} />
              <Input label={t('portal.profile.phone2')} value={form.phone2} onChangeText={(v) => setForm((p) => ({ ...p, phone2: v }))} />
              <Input label={t('portal.profile.dob')} value={form.date_of_birth} onChangeText={(v) => setForm((p) => ({ ...p, date_of_birth: v }))} />
              <Input label={t('portal.profile.address')} value={form.address} onChangeText={(v) => setForm((p) => ({ ...p, address: v }))} />
              <Input label={t('portal.profile.maps')} value={form.google_maps_location} onChangeText={(v) => setForm((p) => ({ ...p, google_maps_location: v }))} />
              <Input label={t('portal.profile.height')} value={String(form.height || '')} onChangeText={(v) => setForm((p) => ({ ...p, height: v }))} />
              <Input label={t('portal.profile.weight')} value={String(form.weight || '')} onChangeText={(v) => setForm((p) => ({ ...p, weight: v }))} />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button variant="secondary" onPress={() => setIsEditing(false)}>
                {t('common.cancel')}
              </Button>
              <Button onPress={onSave} loading={loading}>
                {t('portal.profile.save')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  identityInfo: {
    flex: 1,
  },
  meta: {
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  photoPicker: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  photoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  formGrid: {
    gap: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
  rtl: {
    direction: 'rtl',
  },
});
