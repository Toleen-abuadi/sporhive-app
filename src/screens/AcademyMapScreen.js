import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { endpoints } from '../services/api/endpoints';
import { useSmartBack } from '../navigation/useSmartBack';

import { Screen } from '../components/ui/Screen';
import { AppHeader } from '../components/ui/AppHeader';
import { BottomSheetModal } from '../components/ui/BottomSheetModal';
import { Card } from '../components/ui/Card';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Divider } from '../components/ui/Divider';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LeafletMap } from '../components/LeafletMap';

import { MapPin, X, Filter } from 'lucide-react-native';
import { borderRadius, spacing } from '../theme/tokens';
import { useUserLocation } from '../hooks/useUserLocation';
import { distanceKm, formatDistanceLabel } from '../utils/distance';
import { DEFAULT_MAP_CENTER, averageCenter, normalizeLatLng } from '../utils/map';

function safeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveAcademyPosition = (academy) =>
  normalizeLatLng({
    lat: academy?.lat ?? academy?.latitude,
    lng: academy?.lng ?? academy?.longitude,
  });

export function AcademyMapScreen() {
  const router = useRouter();
  const { goBack } = useSmartBack();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sport, setSport] = useState('');
  const [city, setCity] = useState('');

  const [selected, setSelected] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { userLocation, locationStatus, requestLocation } = useUserLocation({
    autoRequest: true,
  });

  const fetchMap = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await endpoints.publicAcademies.map({
        sport: sport || '',
        city: city || '',
      });

      const list = Array.isArray(res?.data) ? res.data : [];
      setItems(list);
    } catch (requestError) {
      setError(requestError?.message || t('common.error', 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  }, [city, sport, t]);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  const normalizedAcademies = useMemo(
    () =>
      items
        .map((item) => item?.academy || item)
        .filter(Boolean),
    [items]
  );

  const mapAcademies = useMemo(() => {
    return normalizedAcademies
      .map((academy) => {
        const position = resolveAcademyPosition(academy);
        if (!academy?.slug || !position) return null;

        const backendDistance = toNumberOrNull(
          academy?.distance_km ?? academy?.distanceKm
        );
        const fallbackDistance = distanceKm(userLocation, position);
        const resolvedDistance = backendDistance ?? fallbackDistance ?? null;

        return {
          ...academy,
          position,
          distance_km: resolvedDistance,
          distanceKm: resolvedDistance,
        };
      })
      .filter(Boolean);
  }, [normalizedAcademies, userLocation]);

  const mapMarkers = useMemo(
    () =>
      mapAcademies.map((academy) => ({
        id: academy.slug,
        position: academy.position,
        title: safeText(academy.name_en || academy.name_ar || academy.name),
        description: safeText(academy.city),
      })),
    [mapAcademies]
  );

  const mapCenter = useMemo(() => {
    const points = mapAcademies.map((academy) => academy.position).filter(Boolean);
    const fallback = normalizeLatLng(userLocation) || DEFAULT_MAP_CENTER;
    return averageCenter(points, fallback);
  }, [mapAcademies, userLocation]);

  const onSelect = useCallback((academy) => {
    setSelected(academy);
    setPreviewOpen(true);
  }, []);

  const onMapMarkerPress = useCallback(
    (markerId) => {
      const academy = mapAcademies.find(
        (entry) => String(entry.slug) === String(markerId)
      );
      if (!academy) return;
      onSelect(academy);
    },
    [mapAcademies, onSelect]
  );

  const onViewTemplate = useCallback(() => {
    const slug = selected?.slug;
    if (!slug) return;
    setPreviewOpen(false);
    router.push(`/academies/${slug}`);
  }, [router, selected]);

  const onJoin = useCallback(() => {
    const slug = selected?.slug;
    if (!slug) return;
    setPreviewOpen(false);
    router.push(`/academies/${slug}/join`);
  }, [router, selected]);

  const selectedDistanceLabel = useMemo(() => {
    if (!selected) return '';
    const backendDistance = toNumberOrNull(selected?.distance_km ?? selected?.distanceKm);
    const fallbackDistance = distanceKm(userLocation, selected?.position);
    return formatDistanceLabel(backendDistance ?? fallbackDistance);
  }, [selected, userLocation]);

  const showLocationWarning =
    locationStatus === 'denied' ||
    locationStatus === 'blocked' ||
    locationStatus === 'unavailable';

  return (
    <Screen safe scroll={false} style={{ backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <AppHeader
          title={t('academies.map.title', 'Academies map')}
          subtitle={t(
            'academies.map.subtitle',
            'Explore nearby academies and open the template in one tap.'
          )}
          onBackPress={goBack}
          rightAction={{
            icon: <Filter size={20} color={colors.textPrimary} />,
            onPress: () => setFiltersOpen(true),
            accessibilityLabel: t('academies.filters.open', 'Filters'),
          }}
        />
      </View>

      <View style={styles.mapWrap}>
        <LeafletMap
          markers={mapMarkers}
          center={mapCenter}
          userLocation={userLocation}
          onMarkerPress={onMapMarkerPress}
          zoom={12}
        />

        {loading ? (
          <View
            style={[
              styles.overlay,
              {
                backgroundColor: isDark
                  ? 'rgba(0,0,0,0.22)'
                  : 'rgba(255,255,255,0.22)',
              },
            ]}
          >
            <Card
              style={[
                styles.overlayCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text weight="bold">{t('common.loading', 'Loading')}...</Text>
              <Text
                variant="caption"
                color={colors.textSecondary}
                style={{ marginTop: 6 }}
              >
                {t('academies.map.loadingSub', 'Fetching academies for the map...')}
              </Text>
            </Card>
          </View>
        ) : error ? (
          <View style={styles.overlay}>
            <View style={{ paddingHorizontal: spacing.lg, width: '100%' }}>
              <ErrorState
                title={t('common.error', 'Error')}
                message={error}
                actionLabel={t('common.tryAgain', 'Try again')}
                onAction={fetchMap}
              />
            </View>
          </View>
        ) : mapAcademies.length === 0 ? (
          <View style={styles.overlay}>
            <View style={{ paddingHorizontal: spacing.lg, width: '100%' }}>
              <EmptyState
                title={t('academies.map.emptyTitle', 'No academies on map')}
                message={t(
                  'academies.map.emptySub',
                  'Try removing filters to see more results.'
                )}
                actionLabel={t('common.reset', 'Reset')}
                onAction={() => {
                  setSport('');
                  setCity('');
                  fetchMap();
                }}
              />
            </View>
          </View>
        ) : null}

        {showLocationWarning && !loading && !error ? (
          <View
            style={[
              styles.locationBanner,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          >
            <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
              {t(
                'academies.map.locationDenied',
                'Location permission is unavailable. Using the default map center.'
              )}
            </Text>
            <Button variant="ghost" size="small" onPress={requestLocation}>
              {t('common.retry', 'Retry')}
            </Button>
          </View>
        ) : null}
      </View>

      <BottomSheetModal visible={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="h4" weight="bold" style={{ color: colors.textPrimary }}>
              {t('academies.filters.title', 'Smart filters')}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {t('academies.map.filtersSub', 'Filters affect what appears on the map.')}
            </Text>
          </View>

          <Button
            variant="ghost"
            onPress={() => setFiltersOpen(false)}
            style={{ paddingHorizontal: 10 }}
          >
            <X size={18} color={colors.textPrimary} />
          </Button>
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Input
            label={t('academies.sport', 'Sport')}
            value={sport}
            onChangeText={setSport}
            placeholder="e.g. Football"
          />
          <Input
            label={t('academies.city', 'City')}
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Amman"
          />

          <Divider />

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => {
                setSport('');
                setCity('');
              }}
            >
              <Text
                variant="caption"
                weight="bold"
                style={{ color: colors.textPrimary }}
              >
                {t('common.reset', 'Reset')}
              </Text>
            </Button>

            <Button
              style={{ flex: 1 }}
              onPress={async () => {
                setFiltersOpen(false);
                await fetchMap();
              }}
            >
              <Text variant="caption" weight="bold" style={{ color: colors.white }}>
                {t('common.apply', 'Apply')}
              </Text>
            </Button>
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal visible={previewOpen} onClose={() => setPreviewOpen(false)}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark
                  ? 'rgba(255,165,0,0.12)'
                  : 'rgba(255,165,0,0.10)',
              }}
            >
              <MapPin size={18} color={colors.accentOrange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h4" weight="bold" numberOfLines={1}>
                {safeText(selected?.name_en || selected?.name_ar || selected?.name) ||
                  t('academies.unnamed', 'Academy')}
              </Text>
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {safeText(selected?.city)}
                {safeText(selected?.address) ? ` | ${safeText(selected.address)}` : ''}
                {selectedDistanceLabel ? ` | ${selectedDistanceLabel}` : ''}
              </Text>
            </View>
            <Button
              variant="ghost"
              onPress={() => setPreviewOpen(false)}
              style={{ paddingHorizontal: 10 }}
            >
              <X size={18} color={colors.textPrimary} />
            </Button>
          </View>

          <Card
            style={{
              borderRadius: borderRadius.xl,
              borderColor: colors.border,
              backgroundColor: colors.surfaceElevated,
            }}
          >
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text variant="caption" color={colors.textSecondary}>
                {t(
                  'academies.map.previewHint',
                  'Open the full template or join directly.'
                )}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  marginTop: spacing.sm,
                }}
              >
                <Button variant="secondary" style={{ flex: 1 }} onPress={onViewTemplate}>
                  <Text
                    variant="caption"
                    weight="bold"
                    style={{ color: colors.textPrimary }}
                  >
                    {t('academies.view', 'View')}
                  </Text>
                </Button>
                <Button style={{ flex: 1 }} onPress={onJoin}>
                  <Text variant="caption" weight="bold" style={{ color: colors.white }}>
                    {t('academies.joinNow', 'Join')}
                  </Text>
                </Button>
              </View>
            </View>
          </Card>
        </View>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    width: '86%',
  },
  locationBanner: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});

