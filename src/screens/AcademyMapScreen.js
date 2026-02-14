import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AcademyDiscoveryScreen } from './AcademyDiscoveryScreen';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';

import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { endpoints } from '../services/api/endpoints';
import { API_BASE_URL } from '../services/api/client';

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

import { MapPin, X, Filter, Navigation } from 'lucide-react-native';
import { spacing, borderRadius } from '../theme/tokens';

function safeText(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function toAbsoluteUrlMaybe(url, base) {
  if (!url) return null;
  const s = String(url);
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (!base) return s;
  return `${base.replace(/\/$/, '')}/${s.replace(/^\//, '')}`;
}

function academyImageUrl(base, slug, kind) {
  if (!base || !slug) return null;
  // NOTE: your Template screen uses this same path pattern
  return `${base.replace(/\/$/, '')}/public/academies/image/${encodeURIComponent(slug)}/${kind}`;
}

export function AcademyMapScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  // Filters (backend map endpoint supports sport/city) :contentReference[oaicite:5]{index=5}
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sport, setSport] = useState('');
  const [city, setCity] = useState('');

  const [selected, setSelected] = useState(null); // selected academy marker
  const [previewOpen, setPreviewOpen] = useState(false);

  const initialRegion = useMemo(() => {
    // Default: Amman-ish (safe fallback)
    return {
      latitude: 31.9539,
      longitude: 35.9106,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
    };
  }, []);

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

      // Auto fit markers (nice pro touch)
      const points = list
        .map((x) => x?.academy || x)
        .filter((a) => a?.lat != null && a?.lng != null);

      if (points.length >= 2 && mapRef.current?.fitToCoordinates) {
        const coords = points.map((a) => ({ latitude: Number(a.lat), longitude: Number(a.lng) }));
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 90, right: 60, bottom: 260, left: 60 },
            animated: true,
          });
        }, 250);
      }
    } catch (e) {
      setError(e?.message || t('common.error', 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  }, [city, sport, t]);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  const normalizedAcademies = useMemo(() => {
    return items
      .map((x) => x?.academy || x)
      .filter((a) => a?.slug && a?.lat != null && a?.lng != null);
  }, [items]);

  const onSelect = useCallback((academy) => {
    setSelected(academy);
    setPreviewOpen(true);
  }, []);

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

  const coverUri = useMemo(() => {
    if (!selected?.slug) return null;
    return (
      toAbsoluteUrlMaybe(selected?.cover_url, API_BASE_URL) ||
      academyImageUrl(API_BASE_URL, selected.slug, 'cover')
    );
  }, [selected]);

  const logoUri = useMemo(() => {
    if (!selected?.slug) return null;
    return (
      toAbsoluteUrlMaybe(selected?.logo_url, API_BASE_URL) ||
      academyImageUrl(API_BASE_URL, selected.slug, 'logo')
    );
  }, [selected]);

  return (
    <Screen safe scroll={false} style={{ backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <AppHeader
          title={t('academies.map.title', 'Academies map')}
          subtitle={t('academies.map.subtitle', 'Explore nearby academies and open the template in one tap.')}
          leftAction={{ icon: <Navigation size={20} color={colors.textPrimary} />, onPress: () => router.back() }}
          rightAction={{
            icon: <Filter size={20} color={colors.textPrimary} />,
            onPress: () => setFiltersOpen(true),
            accessibilityLabel: t('academies.filters.open', 'Filters'),
          }}
        />
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {normalizedAcademies.map((a) => (
            <Marker
              key={a.slug}
              coordinate={{ latitude: Number(a.lat), longitude: Number(a.lng) }}
              title={safeText(a.name_en || a.name_ar || a.name)}
              description={safeText(a.city)}
              onPress={() => onSelect(a)}
            />
          ))}
        </MapView>

        {/* Loading / Empty / Error overlays */}
        {loading ? (
          <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)' }]}>
            <Card style={[styles.overlayCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text weight="bold">{t('common.loading', 'Loading')}…</Text>
              <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 6 }}>
                {t('academies.map.loadingSub', 'Fetching academies for the map…')}
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
        ) : normalizedAcademies.length === 0 ? (
          <View style={styles.overlay}>
            <View style={{ paddingHorizontal: spacing.lg, width: '100%' }}>
              <EmptyState
                title={t('academies.map.emptyTitle', 'No academies on map')}
                message={t('academies.map.emptySub', 'Try removing filters to see more results.')}
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
      </View>

      {/* Filters sheet */}
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

          <Button variant="ghost" onPress={() => setFiltersOpen(false)} style={{ paddingHorizontal: 10 }}>
            <X size={18} color={colors.textPrimary} />
          </Button>
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Input label={t('academies.sport', 'Sport')} value={sport} onChangeText={setSport} placeholder="e.g. Football" />
          <Input label={t('academies.city', 'City')} value={city} onChangeText={setCity} placeholder="e.g. Amman" />

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
              <Text variant="caption" weight="bold" style={{ color: colors.textPrimary }}>
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

      {/* Preview sheet */}
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
                backgroundColor: isDark ? 'rgba(255,165,0,0.12)' : 'rgba(255,165,0,0.10)',
              }}
            >
              <MapPin size={18} color={colors.accentOrange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h4" weight="bold" numberOfLines={1}>
                {safeText(selected?.name_en || selected?.name_ar || selected?.name) || t('academies.unnamed', 'Academy')}
              </Text>
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {safeText(selected?.city)} {safeText(selected?.address) ? `• ${safeText(selected.address)}` : ''}
              </Text>
            </View>
            <Button variant="ghost" onPress={() => setPreviewOpen(false)} style={{ paddingHorizontal: 10 }}>
              <X size={18} color={colors.textPrimary} />
            </Button>
          </View>

          <Card style={{ borderRadius: borderRadius.xl, borderColor: colors.border, backgroundColor: colors.surfaceElevated }}>
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text variant="caption" color={colors.textSecondary}>
                {t('academies.map.previewHint', 'Open the full template or join directly.')}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                <Button variant="secondary" style={{ flex: 1 }} onPress={onViewTemplate}>
                  <Text variant="caption" weight="bold" style={{ color: colors.textPrimary }}>
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

          {/* Hidden: we already computed coverUri/logoUri for future (if you want to show thumbnail) */}
          {/* You can later add a compact image tile using coverUri/logoUri */}
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
