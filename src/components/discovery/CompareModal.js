import React, { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { SmartImage } from '../ui/SmartImage';
import { makeADTheme } from '../../theme/academyDiscovery.styles';

const formatDistance = (value, formatter) => {
  const numeric = Number(value);
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

const normalizeCellValue = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const CompareModal = memo(function CompareModal({
  visible,
  items = [],
  onClose,
  onRemoveItem,
  onOpenAcademy,
}) {
  const { colors, isDark } = useTheme();
  const { t, isRTL, language } = useI18n();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  const formatter = useMemo(
    () => new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en'),
    [language]
  );

  const orderedItems = useMemo(
    () => (isRTL ? [...items].reverse() : items),
    [isRTL, items]
  );

  const fields = useMemo(() => {
    const unknown = t('service.academy.discovery.compare.values.unknown');
    const yes = t('service.academy.discovery.compare.values.yes');
    const no = t('service.academy.discovery.compare.values.no');
    const open = t('service.academy.discovery.compare.values.open');
    const closed = t('service.academy.discovery.compare.values.closed');
    const pro = t('service.academy.discovery.compare.values.pro');
    const standard = t('service.academy.discovery.compare.values.standard');

    return [
      {
        key: 'rating',
        label: t('service.academy.discovery.compare.fields.rating'),
        getValue: (academy) =>
          academy.rating
            ? `${academy.rating}${academy.ratingCount ? ` (${academy.ratingCount})` : ''}`
            : unknown,
      },
      {
        key: 'sports',
        label: t('service.academy.discovery.compare.fields.sports'),
        getValue: (academy) => (academy.sports?.length ? academy.sports.join(', ') : unknown),
      },
      {
        key: 'location',
        label: t('service.academy.discovery.compare.fields.location'),
        getValue: (academy) => [academy.city, academy.country].filter(Boolean).join(', ') || unknown,
      },
      {
        key: 'ages',
        label: t('service.academy.discovery.compare.fields.ages'),
        getValue: (academy) => formatAgeRange(academy.ageFrom, academy.ageTo, unknown),
      },
      {
        key: 'fees',
        label: t('service.academy.discovery.compare.fields.fees'),
        getValue: (academy) => {
          const amount = Number(academy.feeAmount);
          if (!Number.isFinite(amount)) return unknown;
          return `${formatter.format(amount)}${academy.feeType ? ` ${academy.feeType}` : ''}`;
        },
      },
      {
        key: 'registration',
        label: t('service.academy.discovery.compare.fields.registration'),
        getValue: (academy) => (academy.canJoin ? open : closed),
      },
      {
        key: 'distance',
        label: t('service.academy.discovery.compare.fields.distance'),
        getValue: (academy) => formatDistance(academy.distanceKm, formatter) || unknown,
      },
      {
        key: 'level',
        label: t('service.academy.discovery.compare.fields.level'),
        getValue: (academy) => (academy.isPro ? pro : standard),
      },
      {
        key: 'facilities',
        label: t('service.academy.discovery.compare.fields.facilities'),
        getValue: (academy) => (academy.hasFacilities ? yes : no),
      },
    ];
  }, [formatter, t]);

  const rows = useMemo(
    () =>
      fields.map((field) => {
        const values = orderedItems.map((academy) => field.getValue(academy));
        const normalizedValues = values.map((value) => normalizeCellValue(value));
        const hasDiff = new Set(normalizedValues).size > 1;
        return {
          ...field,
          values,
          hasDiff,
        };
      }),
    [fields, orderedItems]
  );

  const canCompare = orderedItems.length >= 2;

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <View style={styles.headerCopy}>
            <Text variant="h4" weight="bold">
              {t('service.academy.discovery.compare.title')}
            </Text>
            <Text variant="caption" color={theme.text.secondary}>
              {t('service.academy.discovery.compare.subtitle')}
            </Text>
          </View>

          <Button variant="ghost" size="small" onPress={onClose}>
            {t('common.close')}
          </Button>
        </View>

        {!canCompare ? (
          <View
            style={[
              styles.emptyWrap,
              {
                borderColor: theme.hairline,
                backgroundColor: theme.surface1,
              },
            ]}
          >
            <Text variant="bodySmall" color={theme.text.secondary}>
              {t('service.academy.discovery.compare.emptyHint')}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.verticalScroll}
            contentContainerStyle={styles.verticalContent}
            showsVerticalScrollIndicator={false}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableWrap}>
              <View>
                <View style={[styles.tableRow, { borderColor: theme.hairline }]}> 
                  <View
                    style={[
                      styles.fieldCell,
                      styles.headerFieldCell,
                      {
                        borderColor: theme.hairline,
                        backgroundColor: theme.surface1,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="bold" color={theme.text.secondary}>
                      {t('service.academy.discovery.compare.fieldLabel')}
                    </Text>
                  </View>

                  {orderedItems.map((academy) => (
                    <View
                      key={academy.compareId}
                      style={[
                        styles.columnHeaderCell,
                        {
                          borderColor: theme.hairline,
                          backgroundColor: theme.surface1,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => onOpenAcademy?.(academy)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}
                      >
                        <View style={[styles.headerImageWrap, { borderColor: theme.hairline }]}> 
                          <SmartImage
                            source={academy.coverUri || academy.logoUri}
                            fallbackSource={academy.logoUri}
                            style={StyleSheet.absoluteFillObject}
                            borderRadius={10}
                          />
                        </View>

                        <Text variant="caption" weight="bold" numberOfLines={1}>
                          {academy.name}
                        </Text>

                        <Text variant="caption" numberOfLines={1} color={theme.text.secondary}>
                          {[academy.city, academy.country].filter(Boolean).join(', ')}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onRemoveItem?.(academy.compareId)}
                        style={({ pressed }) => [
                          styles.removeAction,
                          { opacity: pressed ? 0.75 : 1, flexDirection: isRTL ? 'row-reverse' : 'row' },
                        ]}
                      >
                        <Feather name="trash-2" size={12} color={theme.accent.orange} />
                        <Text variant="caption" weight="semibold" color={theme.accent.orange}>
                          {t('service.academy.discovery.compare.remove')}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>

                {rows.map((row) => (
                  <View
                    key={row.key}
                    style={[
                      styles.tableRow,
                      {
                        borderColor: theme.hairline,
                        backgroundColor: row.hasDiff ? theme.accent.orangeSoft : theme.surface2,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.fieldCell,
                        {
                          borderColor: theme.hairline,
                          backgroundColor: row.hasDiff ? theme.accent.orangeSoft : theme.surface1,
                        },
                      ]}
                    >
                      <Text variant="caption" weight="bold" numberOfLines={2}>
                        {row.label}
                      </Text>
                    </View>

                    {row.values.map((value, index) => (
                      <View
                        key={`${row.key}:${orderedItems[index]?.compareId || index}`}
                        style={[
                          styles.valueCell,
                          {
                            borderColor: theme.hairline,
                            backgroundColor: row.hasDiff ? theme.accent.orangeSoft : theme.surface2,
                          },
                        ]}
                      >
                        <Text variant="caption" numberOfLines={3}>
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        )}
      </View>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxHeight: '84%',
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  emptyWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  verticalScroll: {
    marginTop: 10,
  },
  verticalContent: {
    paddingBottom: 8,
  },
  tableWrap: {
    paddingBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  fieldCell: {
    width: 126,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRightWidth: 1,
    justifyContent: 'center',
  },
  headerFieldCell: {
    justifyContent: 'flex-start',
  },
  columnHeaderCell: {
    width: 172,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRightWidth: 1,
    justifyContent: 'flex-start',
  },
  valueCell: {
    width: 172,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRightWidth: 1,
    justifyContent: 'center',
  },
  headerImageWrap: {
    height: 74,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 8,
  },
  removeAction: {
    marginTop: 8,
    alignItems: 'center',
    gap: 4,
  },
});

