import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { SmartImage } from '../ui/SmartImage';
import { makeADTheme } from '../../theme/academyDiscovery.styles';

const normalizeAcademy = (item) => item?.academy || item || null;

const toAbsoluteUrlMaybe = (url, base) => {
  if (!url) return null;
  const value = String(url).trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value;
  if (!base) return value;
  return `${base.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
};

const academyImageUrl = (base, slug, kind) => {
  if (!base || !slug) return null;
  return `${base.replace(/\/$/, '')}/public/academies/image/${encodeURIComponent(slug)}/${kind}`;
};

const formatDistance = (distanceKm, formatter) => {
  const numeric = Number(distanceKm);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1) return `${formatter.format(Math.round(numeric * 1000))} m`;
  const precision = numeric < 10 ? 1 : 0;
  return `${formatter.format(Number(numeric.toFixed(precision)))} km`;
};

const formatAgeRange = (from, to, fallback) => {
  const fromNum = Number(from);
  const toNum = Number(to);
  const hasFrom = Number.isFinite(fromNum);
  const hasTo = Number.isFinite(toNum);
  if (!hasFrom && !hasTo) return fallback;
  return `${hasFrom ? fromNum : fallback} - ${hasTo ? toNum : fallback}`;
};

const formatFee = (feeAmount, feeType, fallback, formatter) => {
  const num = Number(feeAmount);
  if (!Number.isFinite(num)) return fallback;
  return `${formatter.format(num)}${feeType ? ` ${feeType}` : ''}`;
};

export const AcademyCard = memo(function AcademyCard({
  item,
  onPress,
  onJoin,
  imageBaseUrl,
  onToggleCompare,
  isCompared = false,
}) {
  const { colors, isDark } = useTheme();
  const { t, isRTL, language } = useI18n();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en'),
    [language]
  );

  const academy = normalizeAcademy(item);

  const vm = useMemo(() => {
    if (!academy) return null;

    const slug = academy.slug || item?.slug || null;
    const id = String(academy.id || slug || item?.id || '');
    const name = academy.name_en || academy.name_ar || academy.name || t('service.academy.common.defaultName');
    const city = academy.city || academy.location || '';
    const country = academy.country || '';
    const sports = Array.isArray(academy.sport_types) ? academy.sport_types.filter(Boolean) : [];

    const rating = academy.rating ?? academy.rating_avg ?? academy.ratingAvg ?? null;
    const ratingCount = academy.rating_count ?? academy.ratingCount ?? null;

    const registrationEnabled = !!academy.registration_enabled || !!academy.registration_open;
    const canJoin = !!academy.registration_enabled && !!academy.registration_open;

    const isPro = !!academy.is_pro;
    const isFeatured = !!academy.is_featured;

    const feeAmount = academy.subscription_fee_amount;
    const feeType = academy.subscription_fee_type || '';

    const ageFrom = academy.ages_from ?? academy.age_from;
    const ageTo = academy.ages_to ?? academy.age_to;

    const nextSlot = academy.next_available_slot || academy.next_slot || academy.nextAvailableSlot || null;

    const distanceKm = item?.distance_km ?? item?.distanceKm ?? academy?.distance_km ?? null;

    const coverUri =
      toAbsoluteUrlMaybe(academy.cover_url, imageBaseUrl) ||
      (academy.cover_meta?.has ? academyImageUrl(imageBaseUrl, slug, 'cover') : null);

    const logoUri =
      toAbsoluteUrlMaybe(academy.logo_url, imageBaseUrl) ||
      (academy.logo_meta?.has ? academyImageUrl(imageBaseUrl, slug, 'logo') : null);

    return {
      id,
      slug,
      name,
      city,
      country,
      sports,
      rating,
      ratingCount,
      registrationEnabled,
      canJoin,
      isPro,
      isFeatured,
      feeAmount,
      feeType,
      ageFrom,
      ageTo,
      nextSlot,
      distanceKm,
      coverUri,
      logoUri,
    };
  }, [academy, imageBaseUrl, item?.distanceKm, item?.distance_km, item?.id, item?.slug, t]);

  if (!vm) return null;

  const shownSports = vm.sports.slice(0, 2);
  const extraSports = Math.max(vm.sports.length - shownSports.length, 0);
  const locationText = [vm.city, vm.country].filter(Boolean).join(', ');
  const distanceText = formatDistance(vm.distanceKm, numberFormatter);
  const emptyValue = t('service.academy.common.emptyValue');

  const ratingText = vm.rating
    ? vm.ratingCount
      ? `${vm.rating} (${vm.ratingCount})`
      : String(vm.rating)
    : null;

  const feeText = formatFee(
    vm.feeAmount,
    vm.feeType,
    t('service.academy.discovery.card.priceNotAvailable'),
    numberFormatter
  );

  const ageRangeText = formatAgeRange(vm.ageFrom, vm.ageTo, emptyValue);

  return (
    <Card
      padding="none"
      style={[
        styles.card,
        {
          borderColor: theme.hairline,
          backgroundColor: theme.surface2,
        },
      ]}
    >
      <Pressable
        onPress={() => onPress?.(academy)}
        style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
      >
        <View style={styles.mediaWrap}>
          <SmartImage
            source={vm.coverUri || vm.logoUri}
            fallbackSource={vm.logoUri}
            style={StyleSheet.absoluteFillObject}
            borderRadius={0}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.56)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          <View style={[styles.mediaTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
            {ratingText ? (
              <View style={styles.ratingPill}>
                <Feather name="star" size={12} color={theme.accent.orange} />
                <Text variant="caption" weight="semibold" style={{ color: theme.text.primary }}>
                  {` ${ratingText}`}
                </Text>
              </View>
            ) : (
              <View />
            )}

            <View style={[styles.badgesWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
              {vm.isPro ? (
                <View style={[styles.badgePill, { backgroundColor: theme.accent.orange }]}>
                  <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                    {t('service.academy.discovery.badges.verified')}
                  </Text>
                </View>
              ) : null}

              {vm.isFeatured ? (
                <View style={styles.featuredPill}>
                  <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                    {t('service.academy.discovery.badges.top')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {distanceText ? (
            <View
              style={[
                styles.distancePill,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  right: isRTL ? undefined : 12,
                  left: isRTL ? 12 : undefined,
                },
              ]}
            >
              <Feather name="navigation" size={12} color={theme.accent.orange} />
              <Text variant="caption" weight="semibold" style={{ color: theme.text.primary }}>
                {` ${t('service.academy.discovery.card.distanceAway', { distance: distanceText })}`}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.content}>
        <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <Text variant="h4" weight="bold" numberOfLines={1} style={styles.titleText}>
            {vm.name}
          </Text>

          <Pressable
            onPress={() => onToggleCompare?.(item)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.compareIconBtn,
              {
                opacity: pressed ? 0.8 : 1,
                borderColor: isCompared ? theme.accent.orange : theme.hairline,
                backgroundColor: isCompared ? theme.accent.orangeSoft : theme.surface1,
              },
            ]}
          >
            <Feather
              name={isCompared ? 'check-square' : 'square'}
              size={15}
              color={isCompared ? theme.accent.orange : theme.text.secondary}
            />
          </Pressable>
        </View>

        <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <Feather name="map-pin" size={13} color={theme.text.muted} />
          <Text variant="caption" color={theme.text.secondary} numberOfLines={1} style={styles.metaText}>
            {locationText || emptyValue}
          </Text>
        </View>

        {shownSports.length ? (
          <Text variant="caption" color={theme.text.secondary} numberOfLines={2}>
            {shownSports.join(' • ')}
            {extraSports > 0 ? ` ${t('service.academy.discovery.card.sportsMore', { count: extraSports })}` : ''}
          </Text>
        ) : null}

        <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <View style={styles.infoCol}>
            <Text variant="caption" color={theme.text.muted}>
              {t('service.academy.card.fees')}
            </Text>
            <Text variant="caption" weight="semibold" numberOfLines={1}>
              {feeText}
            </Text>
          </View>

          <View style={styles.infoCol}>
            <Text variant="caption" color={theme.text.muted}>
              {t('service.academy.card.ages')}
            </Text>
            <Text variant="caption" weight="semibold" numberOfLines={1}>
              {ageRangeText}
            </Text>
          </View>
        </View>

        {vm.nextSlot ? (
          <View style={[styles.slotRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
            <Feather name="clock" size={12} color={theme.text.muted} />
            <Text variant="caption" color={theme.text.secondary} numberOfLines={1} style={styles.metaText}>
              {t('service.academy.discovery.card.nextSlot', { slot: vm.nextSlot })}
            </Text>
          </View>
        ) : null}

        {!vm.registrationEnabled ? (
          <Text variant="caption" color={theme.error} style={styles.registrationClosed}>
            {t('service.academy.card.registrationClosed')}
          </Text>
        ) : null}

        <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <Button size="small" style={styles.detailsButton} onPress={() => onPress?.(academy)}>
            {t('service.academy.discovery.card.details')}
          </Button>

          {vm.canJoin ? (
            <Button size="small" variant="secondary" style={styles.joinButton} onPress={() => onJoin?.(academy)}>
              {t('service.academy.card.join')}
            </Button>
          ) : null}
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  mediaWrap: {
    height: 168,
    overflow: 'hidden',
  },
  mediaTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ratingPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgesWrap: {
    alignItems: 'center',
    gap: 6,
  },
  badgePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  featuredPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  distancePill: {
    position: 'absolute',
    bottom: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 6,
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    flex: 1,
  },
  compareIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    alignItems: 'center',
    gap: 4,
  },
  slotRow: {
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    flex: 1,
  },
  infoRow: {
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  registrationClosed: {
    marginTop: 2,
  },
  actionsRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  detailsButton: {
    flex: 1,
    minHeight: 38,
  },
  joinButton: {
    flex: 1,
    minHeight: 38,
  },
});

