import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { Chip } from '../../../components/ui/Chip';
import { TextField } from '../../../components/ui/TextField';
import { spacing, typography } from '../../../theme/tokens';

const formatDate = (date: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type Filters = {
  activity_id?: string;
  date?: string;
  number_of_players: number;
  duration_id?: string;
  base_location?: string;
  academy_profile_id?: string;
  has_special_offer?: boolean;
  order_by?: 'price_asc' | 'rating_desc';
};

type VenuesFilterSheetProps = {
  visible: boolean;
  filters: Filters;
  onChange: (filters: Filters) => void;
  onApply: (filters: Filters) => void;
  onReset: () => void;
  onClose: () => void;
};

const MIN_PLAYERS = 1;
const MAX_PLAYERS = 14;

export function VenuesFilterSheet({
  visible,
  filters,
  onChange,
  onApply,
  onReset,
  onClose,
}: VenuesFilterSheetProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateValue = useMemo(() => {
    return filters.date ? new Date(filters.date) : null;
  }, [filters.date]);

  const handleDateChange = (_event: unknown, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      onChange({ ...filters, date: formatDate(selected) });
    }
  };

  const handlePlayersChange = (delta: number) => {
    const next = Math.min(
      MAX_PLAYERS,
      Math.max(MIN_PLAYERS, filters.number_of_players + delta),
    );
    onChange({ ...filters, number_of_players: next });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Filters</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <Chip
            label={filters.date ? filters.date : 'Pick a date'}
            onPress={() => setShowDatePicker(true)}
            selected={Boolean(filters.date)}
          />
          {showDatePicker ? (
            <DateTimePicker
              value={dateValue ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleDateChange}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Players</Text>
          <View style={styles.stepperRow}>
            <Chip label="-" onPress={() => handlePlayersChange(-1)} />
            <Text style={styles.stepperValue}>{filters.number_of_players}</Text>
            <Chip label="+" onPress={() => handlePlayersChange(1)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <TextField
            placeholder="Search location"
            value={filters.base_location ?? ''}
            onChangeText={(value) => onChange({ ...filters, base_location: value })}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Order by</Text>
          <View style={styles.tabsRow}>
            <Chip
              label="Rating"
              selected={filters.order_by === 'rating_desc'}
              onPress={() => onChange({ ...filters, order_by: 'rating_desc' })}
              style={styles.tabChip}
            />
            <Chip
              label="Price"
              selected={filters.order_by === 'price_asc'}
              onPress={() => onChange({ ...filters, order_by: 'price_asc' })}
              style={styles.tabChip}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Reset" onPress={onReset} />
          <PrimaryButton label="Apply" onPress={() => onApply(filters)} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '600',
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperValue: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabChip: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
