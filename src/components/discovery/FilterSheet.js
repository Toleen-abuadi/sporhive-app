import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Filter, MapPin, Sparkles } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { Chip } from '../ui/Chip';
import { Divider } from '../ui/Divider';
import { makeADTheme } from '../../theme/academyDiscovery.styles';

export function FilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  onClear,
  activities = [],
  cities = [],
  sortOptions = [],
  capabilities,
  locationStatus,
  onRequestLocation,
}) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
    }
  }, [filters, visible]);

  const hasActivities = activities.length > 0;
  const hasCities = cities.length > 0;

  const toggleActivity = (activity) => {
    setDraft((prev) => ({
      ...prev,
      sport: prev.sport === activity ? '' : activity,
    }));
  };

  const toggleCity = (city) => {
    setDraft((prev) => ({
      ...prev,
      city: prev.city === city ? '' : city,
    }));
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: theme.space.lg, paddingBottom: theme.space.lg }}>
        <View style={{ alignItems: 'center', paddingVertical: theme.space.sm }}>
          <View
            style={{
              width: 48,
              height: 5,
              borderRadius: 999,
              backgroundColor: theme.hairline,
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text variant="h4" weight="bold" style={{ color: theme.text.primary }}>
              {t('service.academy.discovery.filters.title')}
            </Text>
            <Text variant="caption" color={theme.text.secondary}>
              {t('service.academy.discovery.filters.subtitle')}
            </Text>
          </View>
          <Button variant="ghost" onPress={onClose}>
            <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
              {t('service.academy.common.close')}
            </Text>
          </Button>
        </View>

        <View style={{ marginTop: theme.space.lg, gap: theme.space.md }}>
          <Input
            label={t('service.academy.discovery.filters.searchLabel')}
            value={draft?.city}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, city: value }))}
            placeholder={t('service.academy.discovery.filters.city.placeholder')}
          />

          {hasCities ? (
            <View style={{ gap: theme.space.sm }}>
              <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                {t('service.academy.discovery.filters.city.quickPick')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs }}>
                {cities.map((city) => (
                  <Chip
                    key={city}
                    label={city}
                    selected={draft?.city === city}
                    onPress={() => toggleCity(city)}
                    icon={<MapPin size={14} color={draft?.city === city ? colors.accentOrange : colors.textMuted} />}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Input
            label={t('service.academy.discovery.filters.sport.label')}
            value={draft?.sport}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, sport: value }))}
            placeholder={t('service.academy.discovery.filters.sport.placeholder')}
          />

          {hasActivities ? (
            <View style={{ gap: theme.space.sm }}>
              <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                {t('service.academy.discovery.filters.sport.quickPick')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs }}>
                {activities.map((activity) => (
                  <Chip
                    key={activity}
                    label={activity}
                    selected={draft?.sport === activity}
                    onPress={() => toggleActivity(activity)}
                    icon={<Filter size={14} color={draft?.sport === activity ? colors.accentOrange : colors.textMuted} />}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('service.academy.discovery.filters.ageFrom.label')}
                value={draft?.ageFrom}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, ageFrom: value }))}
                placeholder={t('service.academy.discovery.filters.ageFrom.placeholder')}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('service.academy.discovery.filters.ageTo.label')}
                value={draft?.ageTo}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, ageTo: value }))}
                placeholder={t('service.academy.discovery.filters.ageTo.placeholder')}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm }}>
            {capabilities?.supportsOpenRegistration ? (
              <Chip
                label={t('service.academy.discovery.filters.registrationEnabled')}
                selected={!!draft?.registrationEnabled}
                onPress={() => setDraft((prev) => ({ ...prev, registrationEnabled: !prev.registrationEnabled }))}
                icon={<Filter size={14} color={draft?.registrationEnabled ? colors.accentOrange : colors.textMuted} />}
              />
            ) : null}
            <Chip
              label={t('service.academy.discovery.filters.proOnly')}
              selected={!!draft?.proOnly}
              onPress={() => setDraft((prev) => ({ ...prev, proOnly: !prev.proOnly }))}
              icon={<Sparkles size={14} color={draft?.proOnly ? colors.accentOrange : colors.textMuted} />}
            />
          </View>

          {capabilities?.supportsSort && sortOptions?.length ? (
            <View style={{ gap: theme.space.sm }}>
              <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                {t('service.academy.discovery.filters.sortLabel')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs }}>
                {sortOptions.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={draft?.sort === option.value}
                    onPress={() => setDraft((prev) => ({ ...prev, sort: option.value }))}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {draft?.sort === 'nearest' ? (
            <View style={{ padding: theme.space.md, borderRadius: theme.radius.md, backgroundColor: theme.surface2 }}>
              <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                {t('service.academy.discovery.location.title')}
              </Text>
              <Text variant="caption" color={theme.text.secondary} style={{ marginTop: theme.space.xs }}>
                {locationStatus === 'granted'
                  ? t('service.academy.discovery.location.granted')
                  : t('service.academy.discovery.location.prompt')}
              </Text>
              {locationStatus !== 'granted' ? (
                <Button
                  style={{ marginTop: theme.space.sm }}
                  onPress={onRequestLocation}
                  disabled={locationStatus === 'asking'}
                >
                  <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                    {locationStatus === 'asking'
                      ? t('service.academy.discovery.location.asking')
                      : t('service.academy.discovery.location.enable')}
                  </Text>
                </Button>
              ) : null}
            </View>
          ) : null}

          <Divider />

          <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={onClear}>
              <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                {t('service.academy.discovery.filters.reset')}
              </Text>
            </Button>
            <Button
              style={{ flex: 1 }}
              onPress={() => {
                onApply?.(draft);
              }}
            >
              <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                {t('service.academy.discovery.filters.apply')}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </BottomSheetModal>
  );
}
