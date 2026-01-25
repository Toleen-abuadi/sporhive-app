import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CalendarDays, Flame, MapPin, SlidersHorizontal, Star, Tag, Users } from 'lucide-react-native';

import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Text } from '../ui/Text';
import { Input } from '../ui/Input';
import { Chip } from '../ui/Chip';
import { Button } from '../ui/Button';
import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

const DEFAULT_FILTERS = {
  activityId: '',
  date: '',
  players: 2,
  baseLocation: '',
  hasSpecialOffer: false,
  sortBy: 'rating_desc',
};

export function VenuesFilterSheet({
  open,
  initialFilters,
  onApply,
  onClose,
  activities = [],
  loadingActivities = false,
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const activityIcons = [Star, Flame, Tag, Users];

  const activeFilters = useMemo(() => {
    const items = [];
    if (filters.activityId) {
      const activity = activities.find((item) => String(item.id) === String(filters.activityId));
      if (activity?.name) items.push(activity.name);
    }
    if (filters.date) items.push(filters.date);
    if (filters.players)
      items.push(t('service.playgrounds.filters.playersCount', { count: filters.players }));
    if (filters.baseLocation) items.push(filters.baseLocation);
    if (filters.hasSpecialOffer) items.push(t('service.playgrounds.filters.offers'));
    if (filters.sortBy)
      items.push(
        filters.sortBy === 'price_asc'
          ? t('service.playgrounds.filters.sort.lowestPrice')
          : t('service.playgrounds.filters.sort.topRated')
      );
    return items;
  }, [activities, filters, t]);

  useEffect(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      ...initialFilters,
    });
  }, [initialFilters]);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleApply = useCallback(() => {
    onApply(filters);
    onClose();
  }, [filters, onApply, onClose]);

  return (
    <BottomSheetModal visible={open} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <SlidersHorizontal size={18} color={colors.textMuted} />
            <Text variant="h4" weight="semibold">
              {t('service.playgrounds.filters.title')}
            </Text>
          </View>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {activeFilters.length
              ? t('service.playgrounds.filters.active', { filters: activeFilters.join(' · ') })
              : t('service.playgrounds.filters.none')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              {t('service.playgrounds.filters.activity')}
            </Text>
            <View style={styles.chipsRow}>
              {loadingActivities ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.filters.loadingActivities')}
                </Text>
              ) : activities.length ? (
                activities.map((activity, index) => {
                  const Icon = activityIcons[index % activityIcons.length];
                  return (
                    <Chip
                      key={String(activity.id)}
                      label={activity.name || t('service.playgrounds.filters.activityFallback')}
                      selected={String(filters.activityId || '') === String(activity.id)}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          activityId: String(prev.activityId) === String(activity.id) ? '' : String(activity.id),
                        }))
                      }
                      icon={<Icon size={12} color={colors.textMuted} />}
                      accessibilityLabel={t('service.playgrounds.filters.activityAccessibility', {
                        activity: activity.name || t('service.playgrounds.filters.activityFallback'),
                      })}
                    />
                  );
                })
              ) : (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('service.playgrounds.filters.noActivities')}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              {t('service.playgrounds.filters.bookingDate')}
            </Text>
            <Input
              label={t('service.playgrounds.filters.dateLabel')}
              value={filters.date || ''}
              onChangeText={(value) => setFilters((prev) => ({ ...prev, date: value }))}
              placeholder={t('service.playgrounds.filters.datePlaceholder')}
              leftIcon="calendar"
              accessibilityLabel={t('service.playgrounds.filters.dateAccessibility')}
            />
            <View style={styles.chipsRow}>
              <Chip
                label={t('service.playgrounds.filters.today')}
                selected={filters.date === new Date().toISOString().slice(0, 10)}
                onPress={() =>
                  setFilters((prev) => ({ ...prev, date: new Date().toISOString().slice(0, 10) }))
                }
                icon={<CalendarDays size={12} color={colors.textMuted} />}
              />
              <Chip
                label={t('service.playgrounds.filters.clearDate')}
                selected={!filters.date}
                onPress={() => setFilters((prev) => ({ ...prev, date: '' }))}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              {t('service.playgrounds.filters.players')}
            </Text>
            <View style={styles.stepperRow}>
              <Button
                variant="secondary"
                size="small"
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    players: Math.max(1, (prev.players || 2) - 1),
                  }))
                }
                accessibilityLabel={t('service.playgrounds.filters.decreasePlayers')}
              >
                -
              </Button>
              <View style={[styles.stepperValue, { backgroundColor: colors.surfaceElevated }]}>
                <Users size={16} color={colors.textMuted} />
                <Text variant="bodySmall" weight="semibold">
                  {filters.players || 2}
                </Text>
              </View>
              <Button
                variant="secondary"
                size="small"
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    players: (prev.players || 2) + 1,
                  }))
                }
                accessibilityLabel={t('service.playgrounds.filters.increasePlayers')}
              >
                +
              </Button>
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              {t('service.playgrounds.filters.location')}
            </Text>
            <Input
              label={t('service.playgrounds.filters.locationLabel')}
              value={filters.baseLocation || ''}
              onChangeText={(value) => setFilters((prev) => ({ ...prev, baseLocation: value }))}
              placeholder={t('service.playgrounds.filters.locationPlaceholder')}
              leftIcon="map-pin"
              accessibilityLabel={t('service.playgrounds.filters.locationAccessibility')}
            />
            <View style={styles.chipsRow}>
              <Chip
                label={t('service.playgrounds.filters.useCurrentArea')}
                selected={false}
                onPress={() => {}}
                icon={<MapPin size={12} color={colors.textMuted} />}
                accessibilityLabel={t('service.playgrounds.filters.useCurrentAreaAccessibility')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              {t('service.playgrounds.filters.offers')}
            </Text>
            <View style={styles.chipsRow}>
              <Chip
                label={t('service.playgrounds.filters.offersAll')}
                selected={!filters.hasSpecialOffer}
                onPress={() => setFilters((prev) => ({ ...prev, hasSpecialOffer: false }))}
                accessibilityLabel={t('service.playgrounds.filters.offersAllAccessibility')}
              />
              <Chip
                label={t('service.playgrounds.filters.offersSpecial')}
                selected={!!filters.hasSpecialOffer}
                onPress={() => setFilters((prev) => ({ ...prev, hasSpecialOffer: true }))}
                accessibilityLabel={t('service.playgrounds.filters.offersSpecialAccessibility')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              {t('service.playgrounds.filters.sort.title')}
            </Text>
            <View style={styles.chipsRow}>
              <Chip
                label={t('service.playgrounds.filters.sort.topRated')}
                selected={filters.sortBy === 'rating_desc'}
                onPress={() => setFilters((prev) => ({ ...prev, sortBy: 'rating_desc' }))}
                accessibilityLabel={t('service.playgrounds.filters.sort.topRatedAccessibility')}
              />
              <Chip
                label={t('service.playgrounds.filters.sort.lowestPrice')}
                selected={filters.sortBy === 'price_asc'}
                onPress={() => setFilters((prev) => ({ ...prev, sortBy: 'price_asc' }))}
                accessibilityLabel={t('service.playgrounds.filters.sort.lowestPriceAccessibility')}
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Button
            variant="secondary"
            onPress={handleReset}
            accessibilityLabel={t('service.playgrounds.filters.resetAccessibility')}
          >
            {t('service.playgrounds.filters.reset')}
          </Button>
          <Button onPress={handleApply} accessibilityLabel={t('service.playgrounds.filters.applyAccessibility')}>
            {t('service.playgrounds.filters.apply')}
          </Button>
        </View>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  content: {
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
});
