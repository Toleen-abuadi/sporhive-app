import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CalendarDays, Flame, MapPin, SlidersHorizontal, Star, Tag, Users } from 'lucide-react-native';

import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Text } from '../ui/Text';
import { Input } from '../ui/Input';
import { Chip } from '../ui/Chip';
import { Button } from '../ui/Button';
import { endpoints } from '../../services/api/endpoints';
import { useTheme } from '../../theme/ThemeProvider';
import { Activity, ExploreFilters } from '../../services/playgrounds/types';
import { borderRadius, shadows, spacing } from '../../theme/tokens';

type VenuesFilterSheetProps = {
  open: boolean;
  initialFilters: ExploreFilters;
  onApply: (filters: ExploreFilters) => void;
  onClose: () => void;
};

const DEFAULT_FILTERS: ExploreFilters = {
  activityId: '',
  date: '',
  players: 2,
  baseLocation: '',
  hasSpecialOffer: false,
  sortBy: 'rating_desc',
};

export function VenuesFilterSheet({ open, initialFilters, onApply, onClose }: VenuesFilterSheetProps) {
  const { colors } = useTheme();
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const activityIcons = [Star, Flame, Tag, Users];

  const activeFilters = useMemo(() => {
    const items: string[] = [];
    if (filters.activityId) {
      const activity = activities.find((item) => String(item.id) === String(filters.activityId));
      if (activity?.name) items.push(activity.name);
    }
    if (filters.date) items.push(filters.date);
    if (filters.players) items.push(`${filters.players} players`);
    if (filters.baseLocation) items.push(filters.baseLocation);
    if (filters.hasSpecialOffer) items.push('Offers');
    if (filters.sortBy) items.push(filters.sortBy === 'price_asc' ? 'Lowest price' : 'Top rated');
    return items;
  }, [activities, filters]);

  const loadActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const res = await endpoints.playgrounds.activitiesList({ include_inactive: false });
      const list = Array.isArray(res?.activities)
        ? res.activities
        : Array.isArray(res?.data?.activities)
        ? res.data.activities
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setActivities(list);
    } catch {
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      ...initialFilters,
    });
  }, [initialFilters]);

  useEffect(() => {
    if (open) {
      loadActivities();
    }
  }, [loadActivities, open]);

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
              Filters
            </Text>
          </View>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {activeFilters.length ? `Active: ${activeFilters.join(' · ')}` : 'No active filters'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              Activity
            </Text>
            <View style={styles.chipsRow}>
              {loadingActivities ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Loading activities...
                </Text>
              ) : activities.length ? (
                activities.map((activity, index) => {
                  const Icon = activityIcons[index % activityIcons.length];
                  return (
                    <Chip
                      key={String(activity.id)}
                      label={activity.name || 'Activity'}
                      selected={String(filters.activityId || '') === String(activity.id)}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          activityId: String(prev.activityId) === String(activity.id) ? '' : String(activity.id),
                        }))
                      }
                      icon={<Icon size={12} color={colors.textMuted} />}
                      accessibilityLabel={`Filter by ${activity.name || 'activity'}`}
                    />
                  );
                })
              ) : (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  No activities available.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              Booking date
            </Text>
            <Input
              label="Date"
              value={filters.date || ''}
              onChangeText={(value) => setFilters((prev) => ({ ...prev, date: value }))}
              placeholder="YYYY-MM-DD"
              leftIcon="calendar"
              accessibilityLabel="Select booking date"
            />
            <View style={styles.chipsRow}>
              <Chip
                label="Today"
                selected={filters.date === new Date().toISOString().slice(0, 10)}
                onPress={() =>
                  setFilters((prev) => ({ ...prev, date: new Date().toISOString().slice(0, 10) }))
                }
                icon={<CalendarDays size={12} color={colors.textMuted} />}
              />
              <Chip
                label="Clear date"
                selected={!filters.date}
                onPress={() => setFilters((prev) => ({ ...prev, date: '' }))}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              Players
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
                accessibilityLabel="Decrease players"
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
                accessibilityLabel="Increase players"
              >
                +
              </Button>
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              Location
            </Text>
            <Input
              label="Location"
              value={filters.baseLocation || ''}
              onChangeText={(value) => setFilters((prev) => ({ ...prev, baseLocation: value }))}
              placeholder="City or area"
              leftIcon="map-pin"
              accessibilityLabel="Filter by location"
            />
            <View style={styles.chipsRow}>
              <Chip
                label="Use current area"
                selected={false}
                onPress={() => {}}
                icon={<MapPin size={12} color={colors.textMuted} />}
                accessibilityLabel="Use current location"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              Offers
            </Text>
            <View style={styles.chipsRow}>
              <Chip
                label="All"
                selected={!filters.hasSpecialOffer}
                onPress={() => setFilters((prev) => ({ ...prev, hasSpecialOffer: false }))}
                accessibilityLabel="Show all venues"
              />
              <Chip
                label="Special offers"
                selected={!!filters.hasSpecialOffer}
                onPress={() => setFilters((prev) => ({ ...prev, hasSpecialOffer: true }))}
                accessibilityLabel="Show special offers"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              Sort by
            </Text>
            <View style={styles.chipsRow}>
              <Chip
                label="Top rated"
                selected={filters.sortBy === 'rating_desc'}
                onPress={() => setFilters((prev) => ({ ...prev, sortBy: 'rating_desc' }))}
                accessibilityLabel="Sort by top rated"
              />
              <Chip
                label="Lowest price"
                selected={filters.sortBy === 'price_asc'}
                onPress={() => setFilters((prev) => ({ ...prev, sortBy: 'price_asc' }))}
                accessibilityLabel="Sort by lowest price"
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Button variant="secondary" onPress={handleReset} accessibilityLabel="Reset filters">
            Reset
          </Button>
          <Button onPress={handleApply} accessibilityLabel="Apply filters">
            Apply filters
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
    backgroundColor: 'rgba(0,0,0,0.05)',
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
