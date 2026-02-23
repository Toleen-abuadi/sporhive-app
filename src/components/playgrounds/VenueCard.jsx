import React, { memo } from 'react';
import {
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Building2, MapPin } from 'lucide-react-native';

import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

export const VenueCard = memo(function VenueCard({
  title,
  location,
  heroImageUrl,
  logoImageUrl,
  badges = [],
  tags = [],
  feesValue,
  capacityValue,
  ratingValue,
  socialProofCount = null,
  onPress,
  onViewPress,
  onBookPress,
}) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const rtl = typeof isRTL === 'boolean' ? isRTL : I18nManager.isRTL;
  const resolvedOnViewPress = onViewPress || onPress;
  const canBook = typeof onBookPress === 'function';

  const normalizedBadges = Array.isArray(badges)
    ? badges.filter(Boolean).slice(0, 3)
    : [];
  const normalizedTags = Array.isArray(tags) ? tags.filter(Boolean).slice(0, 8) : [];

  const stats = [
    { label: t('playgrounds.discovery.fees'), value: feesValue },
    { label: t('playgrounds.discovery.capacity'), value: capacityValue },
    { label: t('playgrounds.discovery.rating'), value: ratingValue },
  ];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('service.playgrounds.cards.viewDetails', { title })}
        style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
      >
        <View style={styles.heroWrap}>
          <SmartImage
            source={heroImageUrl || null}
            style={styles.heroImage}
            borderRadius={borderRadius.xl}
            showLoader
            showSkeleton
            skeletonMode={isDark ? 'dark' : 'light'}
            accessibilityLabel={title}
          />
          {normalizedBadges.length ? (
            <View
              style={[
                styles.badgesOverlay,
                { flexDirection: rtl ? 'row-reverse' : 'row' },
              ]}
            >
              {normalizedBadges.map((badge, index) => (
                <View
                  key={`${badge}-${index}`}
                  style={[styles.badgeChip, styles.badgeChipOverlay]}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{ color: colors.white }}
                    numberOfLines={1}
                  >
                    {badge}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.infoWrap}>
          <View
            style={[
              styles.identityRow,
              { flexDirection: rtl ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[
                styles.logoWrap,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              {logoImageUrl ? (
                <SmartImage
                  source={logoImageUrl}
                  style={styles.logoImage}
                  borderRadius={borderRadius.md}
                  showLoader
                  showSkeleton
                  skeletonMode={isDark ? 'dark' : 'light'}
                  accessibilityLabel={title}
                />
              ) : (
                <Building2 size={18} color={colors.textMuted} />
              )}
            </View>
            <View style={styles.identityCopy}>
              <Text variant="h4" weight="bold" numberOfLines={1}>
                {title}
              </Text>
              <View
                style={[
                  styles.locationRow,
                  { flexDirection: rtl ? 'row-reverse' : 'row' },
                ]}
              >
                <MapPin size={14} color={colors.textMuted} />
                <Text
                  variant="bodySmall"
                  color={colors.textSecondary}
                  numberOfLines={1}
                  style={styles.locationText}
                >
                  {location || t('service.playgrounds.common.locationPending')}
                </Text>
              </View>
            </View>
          </View>

          {normalizedTags.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.tagsRow,
                { flexDirection: rtl ? 'row-reverse' : 'row' },
              ]}
            >
              {normalizedTags.map((tag, index) => (
                <View
                  key={`${tag}-${index}`}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="medium"
                    color={colors.textSecondary}
                    numberOfLines={1}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View
            style={[
              styles.statsRow,
              { borderColor: colors.border, flexDirection: rtl ? 'row-reverse' : 'row' },
            ]}
          >
            {stats.map((stat, index) => (
              <React.Fragment key={stat.label}>
                <View style={styles.statCell}>
                  <Text variant="caption" color={colors.textSecondary}>
                    {stat.label}
                  </Text>
                  <Text
                    variant="bodySmall"
                    weight="semibold"
                    numberOfLines={1}
                    style={styles.statValue}
                  >
                    {stat.value}
                  </Text>
                </View>
                {index < stats.length - 1 ? (
                  <View
                    style={[styles.statDivider, { backgroundColor: colors.border }]}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </View>

          {socialProofCount ? (
            <View
              style={[
                styles.socialProofStrip,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Text variant="caption" color={colors.textSecondary}>
                {t('playgrounds.discovery.socialProof', { count: socialProofCount })}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View
        style={[styles.actionsRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
      >
        <Pressable
          onPress={resolvedOnViewPress}
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionPrimary,
            { backgroundColor: colors.accentOrange, opacity: pressed ? 0.88 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('service.playgrounds.cards.viewDetails', { title })}
        >
          <Text variant="bodySmall" weight="semibold" color={colors.white}>
            {t('playgrounds.discovery.viewPlayground')}
          </Text>
        </Pressable>

        <Pressable
          onPress={onBookPress}
          disabled={!canBook}
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionSecondary,
            {
              borderColor: colors.accentOrange,
              opacity: !canBook ? 0.5 : pressed ? 0.86 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('playgrounds.discovery.book')}
        >
          <Text variant="bodySmall" weight="semibold" color={colors.accentOrange}>
            {t('playgrounds.discovery.book')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  heroWrap: {
    position: 'relative',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 188,
  },
  badgesOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  badgeChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  badgeChipOverlay: {
    backgroundColor: 'rgba(11, 15, 20, 0.76)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  infoWrap: {
    gap: spacing.sm,
  },
  identityRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  locationRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    flex: 1,
  },
  tagsRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  tagChip: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statsRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'stretch',
    paddingVertical: spacing.xs,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  statValue: {
    textAlign: 'center',
  },
  socialProofStrip: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionsRow: {
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  actionPrimary: {
    borderColor: 'transparent',
  },
  actionSecondary: {
    backgroundColor: 'transparent',
  },
});
