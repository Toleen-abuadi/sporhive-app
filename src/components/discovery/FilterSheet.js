import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { Chip } from '../ui/Chip';
import { makeADTheme } from '../../theme/academyDiscovery.styles';
import {
  AGE_PRESET_OPTIONS,
  DEFAULT_DISCOVERY_FILTERS,
  DISTANCE_FILTER_OPTIONS,
  FILTER_LIMITS,
  normalizeDiscoveryFilters,
  SPORT_FILTER_OPTIONS,
} from '../../services/academyDiscovery/discoveryFilters';

const THUMB_SIZE = 24;

const valueToRatio = (value, min, max) => {
  if (max <= min) return 0;
  return (value - min) / (max - min);
};

const ratioToValue = (ratio, min, max, step) => {
  if (max <= min) return min;
  const clamped = Math.max(0, Math.min(1, ratio));
  const raw = min + clamped * (max - min);
  const safeStep = step || 1;
  const stepped = Math.round(raw / safeStep) * safeStep;
  return Math.max(min, Math.min(max, stepped));
};

function DualRangeSlider({
  min,
  max,
  step = 1,
  minValue,
  maxValue,
  onChange,
  isRTL,
  activeColor,
  inactiveColor,
  thumbColor,
  valueFormatter,
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const activeThumbRef = useRef('min');

  const minRatio = valueToRatio(minValue, min, max);
  const maxRatio = valueToRatio(maxValue, min, max);

  const minDisplayRatio = isRTL ? 1 - minRatio : minRatio;
  const maxDisplayRatio = isRTL ? 1 - maxRatio : maxRatio;

  const selectedStart = Math.min(minDisplayRatio, maxDisplayRatio);
  const selectedEnd = Math.max(minDisplayRatio, maxDisplayRatio);

  const updateValueFromTouch = useCallback(
    (locationX, thumbKey) => {
      if (!trackWidth) return;
      const clampedX = Math.max(0, Math.min(trackWidth, locationX));
      const logicalX = isRTL ? trackWidth - clampedX : clampedX;
      const ratio = logicalX / trackWidth;
      const nextValue = ratioToValue(ratio, min, max, step);

      if (thumbKey === 'min') {
        onChange?.(Math.min(nextValue, maxValue), maxValue);
      } else {
        onChange?.(minValue, Math.max(nextValue, minValue));
      }
    },
    [isRTL, max, maxValue, min, minValue, onChange, step, trackWidth]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (!trackWidth) return;
          const x = evt.nativeEvent.locationX;
          const minX = minDisplayRatio * trackWidth;
          const maxX = maxDisplayRatio * trackWidth;

          activeThumbRef.current = Math.abs(x - minX) <= Math.abs(x - maxX) ? 'min' : 'max';
          updateValueFromTouch(x, activeThumbRef.current);
        },
        onPanResponderMove: (evt) => {
          updateValueFromTouch(evt.nativeEvent.locationX, activeThumbRef.current);
        },
      }),
    [maxDisplayRatio, minDisplayRatio, trackWidth, updateValueFromTouch]
  );

  const minThumbLeft = trackWidth ? minDisplayRatio * trackWidth - THUMB_SIZE / 2 : 0;
  const maxThumbLeft = trackWidth ? maxDisplayRatio * trackWidth - THUMB_SIZE / 2 : 0;

  return (
    <View style={styles.sliderShell}>
      <View style={[styles.sliderValuesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
        <Text variant="caption" weight="semibold" numberOfLines={1}>
          {valueFormatter(minValue)}
        </Text>
        <Text variant="caption" weight="semibold" numberOfLines={1}>
          {valueFormatter(maxValue)}
        </Text>
      </View>

      <View
        style={styles.sliderTrackTouch}
        onLayout={(evt) => setTrackWidth(evt.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={[styles.sliderTrackBase, { backgroundColor: inactiveColor }]} />

        <View
          style={[
            styles.sliderTrackActive,
            {
              backgroundColor: activeColor,
              left: `${selectedStart * 100}%`,
              width: `${(selectedEnd - selectedStart) * 100}%`,
            },
          ]}
        />

        <View
          style={[
            styles.sliderThumb,
            {
              left: minThumbLeft,
              borderColor: activeColor,
              backgroundColor: thumbColor,
            },
          ]}
        />

        <View
          style={[
            styles.sliderThumb,
            {
              left: maxThumbLeft,
              borderColor: activeColor,
              backgroundColor: thumbColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const SPORT_ICON_MAP = {
  football: 'target',
  swimming: 'droplet',
  basketball: 'circle',
  tennis: 'activity',
  martialArts: 'shield',
  volleyball: 'wind',
  kens: 'star',
};

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text variant="bodySmall" weight="semibold">
        {title}
      </Text>
      {children}
    </View>
  );
}

export function FilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  resultCount = null,
}) {
  const { colors, isDark } = useTheme();
  const { t, isRTL, language } = useI18n();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  const [draft, setDraft] = useState(() => normalizeDiscoveryFilters(filters));

  useEffect(() => {
    if (visible) {
      setDraft(normalizeDiscoveryFilters(filters));
    }
  }, [filters, visible]);

  const formatCurrency = useCallback(
    (value) => {
      try {
        return new Intl.NumberFormat(language === 'ar' ? 'ar-JO' : 'en-US', {
          style: 'currency',
          currency: 'JOD',
          maximumFractionDigits: 0,
        }).format(value);
      } catch {
        return `${value} JOD`;
      }
    },
    [language]
  );

  const showingResultsText = resultCount != null
    ? t('filters.showingResults', { count: resultCount })
    : t('filters.showingResults', { count: 0 });

  const toggleSport = useCallback((sportKey) => {
    setDraft((prev) => {
      const hasSport = prev.sports.includes(sportKey);
      return {
        ...prev,
        sports: hasSport
          ? prev.sports.filter((entry) => entry !== sportKey)
          : [...prev.sports, sportKey],
      };
    });
  }, []);

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <View style={styles.sheetContainer}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <View style={styles.headerCopy}>
            <Text variant="h4" weight="bold">
              {t('filters.title')}
            </Text>
            <Text variant="caption" color={theme.text.secondary}>
              {t('filters.subtitle')}
            </Text>
          </View>

          <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
            <Pressable
              onPress={() => {
                setDraft({ ...DEFAULT_DISCOVERY_FILTERS });
              }}
              style={({ pressed }) => [styles.resetPressable, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text variant="caption" weight="semibold" color={theme.accent.orange}>
                {t('filters.reset')}
              </Text>
            </Pressable>
            <Button variant="ghost" size="small" onPress={onClose}>
              {t('common.close')}
            </Button>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Section title={t('filters.ageRange')}>
            <DualRangeSlider
              min={FILTER_LIMITS.age.min}
              max={FILTER_LIMITS.age.max}
              step={FILTER_LIMITS.age.step}
              minValue={draft.ageMin}
              maxValue={draft.ageMax}
              onChange={(ageMin, ageMax) => setDraft((prev) => ({ ...prev, ageMin, ageMax }))}
              isRTL={isRTL}
              activeColor={theme.accent.orange}
              inactiveColor={theme.hairline}
              thumbColor={theme.surface0}
              valueFormatter={(value) => `${value}`}
            />

            <View style={[styles.pillsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
              {AGE_PRESET_OPTIONS.map((preset) => {
                const selected = draft.ageMin === preset.min && draft.ageMax === preset.max;
                return (
                  <Chip
                    key={preset.key}
                    label={preset.key}
                    selected={selected}
                    onPress={() => setDraft((prev) => ({ ...prev, ageMin: preset.min, ageMax: preset.max }))}
                  />
                );
              })}
            </View>
          </Section>

          <Section title={t('filters.sport')}>
            <View style={[styles.sportsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
              {SPORT_FILTER_OPTIONS.map((sport) => {
                const selected = draft.sports.includes(sport.key);
                return (
                  <Pressable
                    key={sport.key}
                    onPress={() => toggleSport(sport.key)}
                    style={({ pressed }) => [
                      styles.sportTile,
                      {
                        opacity: pressed ? 0.9 : 1,
                        borderColor: selected ? theme.accent.orange : theme.hairline,
                        backgroundColor: selected ? theme.accent.orangeSoft : theme.surface1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.sportIconWrap,
                        {
                          backgroundColor: selected ? theme.accent.orange : theme.surface2,
                        },
                      ]}
                    >
                      <Feather
                        name={SPORT_ICON_MAP[sport.key] || 'circle'}
                        size={18}
                        color={selected ? theme.text.onDark : theme.text.secondary}
                      />
                    </View>
                    <Text
                      variant="caption"
                      weight="semibold"
                      numberOfLines={1}
                      style={{ color: selected ? theme.accent.orange : theme.text.primary }}
                    >
                      {t(sport.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title={t('filters.registration')}>
            <View
              style={[
                styles.switchRow,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  borderColor: theme.hairline,
                  backgroundColor: theme.surface1,
                },
              ]}
            >
              <View style={styles.switchCopy}>
                <Text variant="bodySmall" weight="semibold">
                  {t('filters.onlyOpenRegistration')}
                </Text>
                <Text variant="caption" color={theme.text.secondary}>
                  {t('filters.registrationOpen')}
                </Text>
              </View>
              <Switch
                value={draft.registrationOpen}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, registrationOpen: value }))}
                trackColor={{ false: theme.hairline, true: theme.accent.orange }}
                thumbColor={theme.surface0}
                ios_backgroundColor={theme.hairline}
              />
            </View>
          </Section>

          <Section title={t('filters.monthlyFee')}>
            <DualRangeSlider
              min={FILTER_LIMITS.fee.min}
              max={FILTER_LIMITS.fee.max}
              step={FILTER_LIMITS.fee.step}
              minValue={draft.feeMin}
              maxValue={draft.feeMax}
              onChange={(feeMin, feeMax) => setDraft((prev) => ({ ...prev, feeMin, feeMax }))}
              isRTL={isRTL}
              activeColor={theme.accent.orange}
              inactiveColor={theme.hairline}
              thumbColor={theme.surface0}
              valueFormatter={formatCurrency}
            />
          </Section>

          <Section title={t('filters.distance')}>
            <View style={[styles.pillsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
              {DISTANCE_FILTER_OPTIONS.map((option) => {
                const selected = draft.distanceKm === option;
                return (
                  <Chip
                    key={`distance-${option}`}
                    label={t(`distance.${option}km`)}
                    selected={selected}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        distanceKm: prev.distanceKm === option ? null : option,
                      }))
                    }
                  />
                );
              })}
            </View>
          </Section>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: theme.hairline,
              backgroundColor: theme.surface0,
            },
          ]}
        >
          <Text variant="caption" color={theme.text.secondary}>
            {showingResultsText}
          </Text>

          <Button
            style={styles.applyButton}
            onPress={() => onApply?.(normalizeDiscoveryFilters(draft))}
          >
            {t('filters.apply')}
          </Button>
        </View>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    width: '100%',
    maxHeight: '86%',
  },
  headerRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerActions: {
    alignItems: 'center',
    gap: 6,
  },
  resetPressable: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  scrollArea: {
    marginTop: 10,
    maxHeight: 500,
  },
  scrollContent: {
    paddingBottom: 14,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sliderShell: {
    gap: 8,
  },
  sliderValuesRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderTrackTouch: {
    height: 40,
    justifyContent: 'center',
  },
  sliderTrackBase: {
    height: 4,
    borderRadius: 999,
  },
  sliderTrackActive: {
    position: 'absolute',
    top: '50%',
    height: 4,
    marginTop: -2,
    borderRadius: 999,
  },
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginTop: -(THUMB_SIZE / 2),
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
  },
  pillsRow: {
    flexWrap: 'wrap',
    gap: 8,
  },
  sportsGrid: {
    flexWrap: 'wrap',
    gap: 10,
  },
  sportTile: {
    width: '48%',
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  sportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  footer: {
    borderTopWidth: 1,
    marginTop: 6,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  applyButton: {
    minWidth: 152,
    minHeight: 44,
    borderRadius: 14,
  },
});



