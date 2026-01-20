import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { borderRadius, spacing } from '../../theme/tokens';
import { Input } from '../ui/Input';
import { Text } from '../ui/Text';
import { SporHiveLoader } from '../ui/SporHiveLoader';
import { PortalListItem } from './PortalListItem';
import { PortalEmptyState } from './PortalEmptyState';
import { useTranslation } from '../../services/i18n/i18n';

export function AcademyPicker({
  academies = [],
  searchQuery,
  onSearchChange,
  onSelect,
  selectedAcademy,
  loading,
  error,
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    if (!searchQuery) return academies;
    const query = searchQuery.trim().toLowerCase();
    return academies.filter((academy) => {
      const name = `${academy?.name || ''} ${academy?.subtitle || ''} ${academy?.label || ''}`;
      return name.toLowerCase().includes(query);
    });
  }, [academies, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={[styles.selectedCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text variant="caption" color={colors.textMuted}>
          {t('portal.login.academyPicker.selectedLabel')}
        </Text>
        <View style={styles.selectedRow}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            {selectedAcademy?.name || t('portal.login.academyPicker.choose')}
          </Text>
          <Feather name="chevron-down" size={18} color={colors.textMuted} />
        </View>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.selectedSubtitle}>
          {selectedAcademy?.subtitle || t('portal.login.academyPicker.helper')}
        </Text>
      </View>

      <Input
        placeholder={t('portal.login.academyPicker.searchPlaceholder')}
        value={searchQuery}
        onChangeText={onSearchChange}
        leftIcon="search"
        style={styles.searchInput}
      />

      {loading ? (
        <View style={[styles.loadingCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <SporHiveLoader
            size={64}
            fullScreen={false}
            label={t('portal.login.academyPicker.loading')}
          />
        </View>
      ) : error ? (
        <View style={[styles.loadingCard, { borderColor: colors.error, backgroundColor: colors.error + '12' }]}>
          <Text variant="bodySmall" color={colors.error}>
            {error}
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <PortalEmptyState
          icon="map"
          title={t('portal.login.academyPicker.emptyTitle')}
          description={t('portal.login.academyPicker.emptyDescription')}
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((academy) => {
            const isSelected = academy.id === selectedAcademy?.id;
            return (
              <PortalListItem
                key={academy.id}
                leadingIcon="shield"
                title={academy.name || academy.label || t('portal.login.academyFallback')}
                subtitle={academy.subtitle || academy.client_name || ''}
                onPress={() => onSelect?.(academy)}
                rightSlot={
                  isSelected ? <Feather name="check-circle" size={18} color={colors.accentOrange} /> : null
                }
                style={[
                  styles.item,
                  {
                    borderColor: isSelected ? colors.accentOrange : colors.border,
                    backgroundColor: isSelected ? colors.accentOrange + '10' : colors.surface,
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  selectedCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  selectedRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedSubtitle: {
    marginTop: spacing.xs,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  loadingCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    borderWidth: 1,
  },
});
