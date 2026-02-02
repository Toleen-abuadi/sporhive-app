import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { Input } from '../ui/Input';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { borderRadius, spacing } from '../../theme/tokens';

export function AcademyPicker({
  academies = [],
  selectedAcademy,
  recentAcademies = [],
  onSelect,
  loading,
  error,
  debbug,
  searchPlaceholder,
  title,
  helper,
  doneLabel,
  loadingLabel,
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return academies;
    const q = query.trim().toLowerCase();
    return academies.filter((academy) =>
      `${academy?.name || ''} ${academy?.subtitle || ''}`.toLowerCase().includes(q)
    );
  }, [academies, query]);

  const handleSelect = (academy) => {
    onSelect?.(academy);
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <View>
          <Text variant="caption" color={colors.textMuted}>
            {title}
          </Text>
          <Text variant="body" weight="semibold" color={colors.textPrimary} style={styles.triggerText}>
            {selectedAcademy?.name || helper}
          </Text>
          {selectedAcademy?.subtitle ? (
            <Text variant="bodySmall" color={colors.textSecondary}>
              {selectedAcademy.subtitle}
            </Text>
          ) : null}
        </View>
        <Feather name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text variant="h4" weight="bold" color={colors.textPrimary}>
                {title}
              </Text>
              <Pressable onPress={() => setOpen(false)}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Input
              placeholder={searchPlaceholder}
              value={query}
              onChangeText={setQuery}
              leftIcon="search"
            />

            {recentAcademies.length ? (
              <View style={styles.recentRow}>
                {recentAcademies.map((academy) => (
                  <Pressable
                    key={`recent-${academy.id}`}
                    onPress={() => handleSelect(academy)}
                    style={[
                      styles.recentChip,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                  >
                    <Text variant="caption" weight="semibold" color={colors.textPrimary}>
                      {academy.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {loading ? (
              <View style={styles.centered}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {loadingLabel || helper}
                </Text>
              </View>
            ) : error ? (
              <View style={styles.centered}>
                <Text variant="bodySmall" color={colors.error}>
                  {error}
                </Text>
                <Text variant="bodySmall" color={colors.error}>
                  {debbug}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                  const isSelected = item.id === selectedAcademy?.id;
                  return (
                    <Pressable
                      onPress={() => handleSelect(item)}
                      style={[
                        styles.listItem,
                        {
                          borderColor: isSelected ? colors.accentOrange : colors.border,
                          backgroundColor: isSelected ? colors.accentOrange + '12' : colors.surface,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text variant="body" weight="semibold" color={colors.textPrimary}>
                          {item.name}
                        </Text>
                        {item.subtitle ? (
                          <Text variant="caption" color={colors.textSecondary}>
                            {item.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <Feather name="check-circle" size={18} color={colors.accentOrange} />
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            )}

            <Button onPress={() => setOpen(false)} style={styles.modalCta}>
              {doneLabel || title}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  trigger: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerText: {
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  list: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  listItem: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  recentChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  centered: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  modalCta: {
    marginTop: spacing.sm,
  },
});
