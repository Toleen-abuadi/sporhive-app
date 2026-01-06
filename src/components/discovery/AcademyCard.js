import React, { useMemo, useState, useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../theme/ThemeProvider';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import {
  Crown,
  MapPin,
  Navigation,
  Sparkles,
  ShieldCheck,
  Wallet,
  Users,
  CalendarDays,
  ArrowRight,
} from 'lucide-react-native';

import {
  makeADTheme,
  pressableScaleConfig,
  cardStyles,
  adGradients,
  adBadges,
} from '../../theme/academyDiscovery.styles';

function formatKm(n) {
  if (n === null || n === undefined) return null;
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  if (num < 1) return `${Math.round(num * 1000)}m`;
  return `${num.toFixed(num < 10 ? 1 : 0)}km`;
}

function normalizeItem(item) {
  if (!item) return { academy: null, distanceKm: null };
  if (item.academy) return { academy: item.academy, distanceKm: item.distance_km ?? item.distanceKm ?? null };
  return { academy: item, distanceKm: item.distance_km ?? null };
}

function AnimatedPress({ children, disabled }) {
  const p = useSharedValue(0);

  const aStyle = useAnimatedStyle(() => {
    const s = interpolate(
      p.value,
      [0, 1],
      [pressableScaleConfig.from, pressableScaleConfig.to],
      Extrapolate.CLAMP
    );
    return { transform: [{ scale: s }] };
  }, []);

  const onIn = useCallback(() => {
    if (disabled) return;
    p.value = withTiming(1, { duration: pressableScaleConfig.in.duration, easing: Easing.out(Easing.quad) });
  }, [disabled, p]);

  const onOut = useCallback(() => {
    if (disabled) return;
    p.value = withTiming(0, { duration: pressableScaleConfig.out.duration, easing: Easing.out(Easing.quad) });
  }, [disabled, p]);

  // Touch wrapper to avoid breaking internal Pressables
  return (
    <Animated.View style={aStyle} onTouchStart={onIn} onTouchEnd={onOut}>
      {children}
    </Animated.View>
  );
}

export function AcademyCard({ item, onPress, onJoin, imageBaseUrl }) {
  const { colors, isDark } = useTheme();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);
  const cs = useMemo(() => cardStyles(theme), [theme]);
  const grads = useMemo(() => adGradients(theme), [theme]);
  const badges = useMemo(() => adBadges(theme), [theme]);

  const { academy, distanceKm } = normalizeItem(item);
  const [coverFailed, setCoverFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const vm = useMemo(() => {
    if (!academy) return null;

    const slug = academy.slug || '';
    const name = academy.name_en || academy.name_ar || 'Academy';
    const city = academy.city || '';
    const country = academy.country || '';
    const isPro = !!academy.is_pro;
    const isFeatured = !!academy.is_featured;
    const regEnabled = !!academy.registration_enabled;
    const regOpen = !!academy.registration_open;
    const hasFacilities = !!academy.has_facilities_booking;

    const feesType = academy.subscription_fee_type || '';
    const feesAmount = academy.subscription_fee_amount ?? (academy.subscription_fee_amount === 0 ? 0 : null);
    const agesFrom = academy.ages_from ?? academy.age_from ?? null;
    const agesTo = academy.ages_to ?? academy.age_to ?? null;
    const sports = Array.isArray(academy.sport_types) ? academy.sport_types : [];

    const hasCover = !!academy.cover_meta?.has;
    const hasLogo = !!academy.logo_meta?.has;

    const coverUri = slug && hasCover ? `${imageBaseUrl}/public/academies/image/${encodeURIComponent(slug)}/cover` : null;
    const logoUri = slug && hasLogo ? `${imageBaseUrl}/public/academies/image/${encodeURIComponent(slug)}/logo` : null;

    return {
      slug,
      name,
      city,
      country,
      isPro,
      isFeatured,
      regEnabled,
      regOpen,
      hasFacilities,
      feesType,
      feesAmount,
      agesFrom,
      agesTo,
      sports,
      coverUri,
      logoUri,
    };
  }, [academy, imageBaseUrl]);

  if (!vm) return null;

  const showCover = !!vm.coverUri && !coverFailed;
  const showLogo = !!vm.logoUri && !logoFailed;
  const locationText = [vm.city, vm.country].filter(Boolean).join(', ');
  const canJoin = vm.regEnabled && vm.regOpen;

  return (
    <Pressable onPress={() => onPress?.(academy)}>
      <AnimatedPress>
        {/* Keep Card component for your system, but styles are now DS-consistent */}
        <Card style={cs.card}>
          {/* Cover */}
          <View style={cs.cover}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface1 }]} />

            {showCover ? (
              <Image
                source={{ uri: vm.coverUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                onError={() => setCoverFailed(true)}
              />
            ) : (
              <LinearGradient
                colors={grads.coverFallback}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.15, y: 0.0 }}
                end={{ x: 0.9, y: 1.0 }}
              />
            )}

            {/* readability overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.58)', 'rgba(0,0,0,0.14)', 'rgba(0,0,0,0.0)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 1.0 }}
              end={{ x: 0.5, y: 0.0 }}
            />

            {/* Badges */}
            <View style={cs.badgeRow}>
              {vm.isPro ? (
                <Badge style={[cs.badgePill, badges.pro]}>
                  <View style={cs.badgeInner}>
                    <Crown size={12} color={theme.text.onDark} />
                    <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                      {' '}
                      PRO
                    </Text>
                  </View>
                </Badge>
              ) : null}

              {vm.isFeatured ? (
                <Badge style={[cs.badgePill, badges.featured]}>
                  <View style={cs.badgeInner}>
                    <Sparkles size={12} color={theme.accent.orange} />
                    <Text variant="caption" weight="bold" style={{ color: theme.accent.orange }}>
                      {' '}
                      Featured
                    </Text>
                  </View>
                </Badge>
              ) : null}
            </View>

            {/* Bottom overlay */}
            <View style={cs.bottomOverlay}>
              <View style={cs.bottomLeft}>
                <Badge
                  style={[
                    cs.badgePill,
                    canJoin ? badges.statusOpen : badges.statusClosed,
                  ]}
                >
                  <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                    {canJoin ? 'Registration open' : 'Not open on SporHive'}
                  </Text>
                </Badge>

                {vm.hasFacilities ? (
                  <Badge style={cs.darkPill}>
                    <View style={cs.badgeInner}>
                      <ShieldCheck size={12} color={theme.text.onDark} />
                      <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                        {' '}
                        Facilities
                      </Text>
                    </View>
                  </Badge>
                ) : null}
              </View>

              {distanceKm != null ? (
                <View style={cs.distancePill}>
                  <Navigation size={14} color={theme.accent.orange} />
                  <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                    {' '}
                    {formatKm(distanceKm)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Content */}
          <View style={cs.content}>
            <View style={cs.row}>
              <View style={[cs.logoWrap, { borderColor: theme.surface2 }]}>
                {showLogo ? (
                  <Image
                    source={{ uri: vm.logoUri }}
                    style={cs.logo}
                    resizeMode="cover"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <LinearGradient
                    colors={grads.logoFallback}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.1, y: 0.0 }}
                    end={{ x: 0.9, y: 1.0 }}
                  />
                )}
              </View>

              <View style={cs.titleWrap}>
                <Text variant="h4" weight="bold" numberOfLines={1} style={{ color: theme.text.primary }}>
                  {vm.name}
                </Text>

                <View style={cs.locRow}>
                  <MapPin size={14} color={theme.text.muted} />
                  <Text variant="caption" color={theme.text.secondary} numberOfLines={1}>
                    {' '}
                    {locationText || '—'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats */}
            <View style={cs.stats}>
              <View style={cs.statBox}>
                <View style={cs.statLabel}>
                  <Wallet size={14} color={theme.accent.orange} />
                  <Text variant="caption" color={theme.text.muted}>
                    {' '}
                    Fees
                  </Text>
                </View>
                <Text variant="caption" weight="bold" style={{ color: theme.text.primary }} numberOfLines={1}>
                  {vm.feesAmount != null ? `${vm.feesAmount}` : '—'}
                  {vm.feesType ? ` (${vm.feesType})` : ''}
                </Text>
              </View>

              <View style={cs.statBox}>
                <View style={cs.statLabel}>
                  <Users size={14} color={theme.accent.orange} />
                  <Text variant="caption" color={theme.text.muted}>
                    {' '}
                    Ages
                  </Text>
                </View>
                <Text variant="caption" weight="bold" style={{ color: theme.text.primary }} numberOfLines={1}>
                  {vm.agesFrom != null || vm.agesTo != null ? `${vm.agesFrom ?? '—'} - ${vm.agesTo ?? '—'}` : '—'}
                </Text>
              </View>

              <View style={cs.statBox}>
                <View style={cs.statLabel}>
                  <CalendarDays size={14} color={theme.accent.orange} />
                  <Text variant="caption" color={theme.text.muted}>
                    {' '}
                    Sport
                  </Text>
                </View>
                <Text variant="caption" weight="bold" style={{ color: theme.text.primary }} numberOfLines={1}>
                  {vm.sports?.length ? vm.sports[0] : '—'}
                  {vm.sports?.length > 1 ? ` +${vm.sports.length - 1}` : ''}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={cs.actions}>
              <Pressable
                onPress={() => onPress?.(academy)}
                style={({ pressed }) => [
                  cs.primaryBtn,
                  { backgroundColor: theme.accent.orange }, // dynamic #1 (theme color)
                  pressed && cs.pressedOpacity,
                ]}
              >
                <View style={cs.btnRow}>
                  <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                    View
                  </Text>
                  <ArrowRight size={14} color={theme.text.onDark} />
                </View>
              </Pressable>

              {canJoin ? (
                <Pressable
                  onPress={() => onJoin?.(academy)}
                  style={({ pressed }) => [cs.secondaryBtn, pressed && cs.pressedOpacity]}
                >
                  <Text variant="caption" weight="bold" style={{ color: theme.accent.orange }}>
                    Join
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Card>
      </AnimatedPress>
    </Pressable>
  );
}
