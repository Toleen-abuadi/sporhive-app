// src/screens/portal/PersonalInfoScreen.js
import React, { useMemo, useState, useCallback } from 'react';
import { Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { usePortalOverview } from '../../services/portal/portal.hooks';
import { colors, spacing, radius, typography, alphaBg } from '../../theme/portal.styles';

import { PortalCard, PortalRow, PortalScreen, PortalButton } from '../../components/portal/PortalPrimitives';
import { EditProfileModal } from './modals/EditProfileModal';

const imgFromBase64 = (b64) => {
  if (!b64) return null;
  if (String(b64).startsWith('data:')) return { uri: b64 };
  return { uri: `data:image/jpeg;base64,${b64}` };
};

export default function PersonalInfoScreen() {
  const { overview, loading, refreshing, error, refresh } = usePortalOverview();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const p = overview?.profile || {};
  const player = overview?.player || {};
  const reg = overview?.registration || {};
  const health = overview?.health_info || {};

  const fullEn = useMemo(() => {
    const a = [p.first_eng_name, p.middle_eng_name, p.last_eng_name].filter(Boolean).join(' ');
    return a || player.fullName || '—';
  }, [p, player]);

  const fullAr = useMemo(() => [p.first_ar_name, p.middle_ar_name, p.last_ar_name].filter(Boolean).join(' ') || '—', [p]);

  const openMaps = useCallback(async () => {
    const url = reg.google_maps_location || p.google_maps_location;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {}
  }, [reg, p]);

  const openTel = useCallback(async (num) => {
    const n = String(num || '').replace(/\s+/g, '');
    if (!n) return;
    try {
      await Linking.openURL(`tel:${n}`);
    } catch {}
  }, []);

  const avatar = imgFromBase64(player.imageBase64);

  return (
    <PortalScreen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.screenPadding, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Animated.View entering={FadeInDown.duration(240)} style={styles.hero}>
          <View style={styles.avatarWrap}>
            {avatar ? (
              <Image source={avatar} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>
                  {(player.fullName || 'P').trim().slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            {!!player.academyName && (
              <View style={styles.badge}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {player.academyName}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle} numberOfLines={2}>{fullEn}</Text>
            <Text style={styles.heroSub} numberOfLines={1}>{fullAr}</Text>

            {!!error && (
              <View style={styles.errPill}>
                <Text style={styles.errPillText}>Couldn’t load profile. Pull to refresh.</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <PortalCard title="Identity" subtitle="Your official information (read-only preview).">
          <PortalRow label="English name" value={fullEn} />
          <PortalRow label="Arabic name" value={fullAr} />
          <PortalRow label="Date of birth" value={(p.date_of_birth || '').slice(0, 10) || '—'} />
          <PortalRow label="Try-out" value={String(reg?.try_out?.id || reg?.try_out_id || '—')} />
        </PortalCard>

        <View style={{ height: spacing.md }} />

        <PortalCard title="Contact">
          <PortalRow
            label="Phone 1"
            value={p.phone1 || player.phone || '—'}
            onPress={() => openTel(p.phone1 || player.phone)}
            tone="soft"
          />
          <PortalRow
            label="Phone 2"
            value={p.phone2 || player.phone2 || '—'}
            onPress={() => openTel(p.phone2 || player.phone2)}
            tone="soft"
          />
        </PortalCard>

        <View style={{ height: spacing.md }} />

        <PortalCard
          title="Address"
          subtitle="Optional but helpful for staff & transport."
          right={
            (reg.google_maps_location || p.google_maps_location) ? (
              <View style={styles.mapsChip}>
                <Text style={styles.mapsChipText}>Maps</Text>
              </View>
            ) : null
          }
        >
          <PortalRow label="Address" value={p.address || reg.address || '—'} />
          <PortalRow
            label="Google maps link"
            value={reg.google_maps_location || p.google_maps_location || '—'}
            onPress={(reg.google_maps_location || p.google_maps_location) ? openMaps : null}
            tone={(reg.google_maps_location || p.google_maps_location) ? 'soft' : 'default'}
          />
        </PortalCard>

        <View style={{ height: spacing.md }} />

        <PortalCard title="Health snapshot" subtitle="Summary only. Update from Edit Profile.">
          <View style={styles.healthGrid}>
            <View style={styles.healthBox}>
              <Text style={styles.healthLabel}>Height</Text>
              <Text style={styles.healthValue}>{health.height != null ? `${health.height} cm` : '—'}</Text>
            </View>
            <View style={styles.healthBox}>
              <Text style={styles.healthLabel}>Weight</Text>
              <Text style={styles.healthValue}>{health.weight != null ? `${health.weight} kg` : '—'}</Text>
            </View>
          </View>
        </PortalCard>
      </ScrollView>

      <EditProfileModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.backgroundCard,
    marginBottom: spacing.md,
  },
  avatarWrap: {
    width: 92,
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 84,
    height: 84,
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
    fontSize: 28,
  },
  badge: {
    maxWidth: 96,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.round,
    backgroundColor: alphaBg(colors.primary, 0.16),
    borderWidth: 1,
    borderColor: alphaBg(colors.primary, 0.35),
  },
  badgeText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  heroTitle: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.xl,
    lineHeight: typography.sizes.xl * 1.15,
  },
  heroSub: {
    marginTop: 4,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
  },
  heroActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  errPill: {
    marginTop: spacing.sm,
    borderRadius: radius.round,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: alphaBg(colors.error, 0.14),
    borderWidth: 1,
    borderColor: alphaBg(colors.error, 0.35),
    alignSelf: 'flex-start',
  },
  errPillText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  mapsChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.round,
    backgroundColor: alphaBg(colors.primary, 0.12),
    borderWidth: 1,
    borderColor: alphaBg(colors.primary, 0.30),
  },
  mapsChipText: {
    color: colors.textPrimary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
  },
  healthGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  healthBox: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  healthLabel: {
    color: colors.textTertiary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.xs,
    marginBottom: 6,
  },
  healthValue: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.lg,
  },
});
