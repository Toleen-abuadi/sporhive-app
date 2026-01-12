// src/screens/portal/PersonalInfoScreen.js
import React, { useMemo, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { usePortal, usePortalRefresh } from '../../services/portal/portal.hooks';
import { colors, spacing, radius, typography, alphaBg } from '../../theme/portal.styles';
import { PortalCard, PortalRow, PortalScreen, PortalHeader, PortalEmptyState } from '../../components/portal/PortalPrimitives';
import { EditProfileModal } from './modals/EditProfileModal';

const imgFromBase64 = (b64) => {
  if (!b64) return null;
  if (String(b64).startsWith('data:')) return { uri: b64 };
  return { uri: `data:image/jpeg;base64,${b64}` };
};

export default function PersonalInfoScreen({ navigation }) {
  const { overview, loading, refreshing, error, refresh } = usePortalOverview();
  const [editOpen, setEditOpen] = useState(false);

  const player = overview?.player || {};
  const phoneNumbers = Array.isArray(player.phoneNumbers) ? player.phoneNumbers : [];

  const avatarSource = player?.avatar?.uri ? { uri: player.avatar.uri } : null;

  const fullName = useMemo(() => {
    return player.fullNameEn || player.fullNameAr || '—';
  }, [player.fullNameAr, player.fullNameEn]);

  const data = useMemo(() => [
    { id: 'hero' },
    { id: 'identity' },
    { id: 'contact' },
  ], []);

  const renderItem = ({ item }) => {
    if (item.id === 'hero') {
      return (
        <Animated.View entering={FadeInDown.duration(240)} style={styles.hero}>
          <View style={styles.avatarWrap}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>
                  {(fullName || 'P').trim().slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle} numberOfLines={2}>{fullName}</Text>
            {!!overview?.academyName && (
              <View style={styles.badge}>
                <Text style={styles.badgeText} numberOfLines={1}>{overview.academyName}</Text>
              </View>
            )}

            {!!error && (
              <View style={styles.errPill}>
                <Text style={styles.errPillText}>Couldn’t load profile. Pull to refresh.</Text>
              </View>
            )}
          </View>
        </Animated.View>
      );
    }

    if (item.id === 'identity') {
      return (
        <PortalCard
          title="Identity"
          subtitle="Your official information"
          right={
            <Text onPress={() => setEditOpen(true)} style={styles.editLink}>
              Edit
            </Text>
          }
          style={{ marginBottom: spacing.md }}
        >
          <PortalRow title="English name" value={player.fullNameEn || '—'} />
          <PortalRow title="Arabic name" value={player.fullNameAr || '—'} />
          <PortalRow title="Date of birth" value={player.dob ? String(player.dob).slice(0, 10) : '—'} />
          <PortalRow title="Created" value={player.createdAt ? String(player.createdAt).slice(0, 10) : '—'} />
        </PortalCard>
      );
    }

    if (item.id === 'contact') {
      return (
        <PortalCard title="Contact" subtitle="Reachable details">
          <PortalRow title="Email" value={player.email || '—'} />
          {phoneNumbers.length ? (
            phoneNumbers.map((phone, idx) => (
              <PortalRow key={`${phone}-${idx}`} title={`Phone ${idx + 1}`} value={phone} />
            ))
          ) : (
            <PortalRow title="Phone" value="—" />
          )}
        </PortalCard>
      );
    }

    return null;
  };

  return (
    <PortalScreen>
      <PortalHeader title="Personal Info" subtitle={overview?.academyName || ''} />
      {!overview && !loading ? (
        <PortalEmptyState
          title="No personal data"
          message="Pull to refresh to load your profile."
          action={onRefresh}
          actionLabel="Refresh"
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(entry) => entry.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.screenPadding, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}

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
    marginTop: spacing.sm,
    maxWidth: 120,
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
  editLink: {
    color: colors.primary,
    fontFamily: typography.family.medium,
    fontSize: typography.sizes.sm,
  },
});
